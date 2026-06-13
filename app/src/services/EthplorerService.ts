/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */

class EthplorerTransactionPaginator {
  private $q: angular.IQService
  private pool: Array<EthplorerAddressTransaction> = []
  private endReached = false
  private newTxsAdded = 0

  constructor(private address: string, private ethplorer: EthplorerService) {
    this.$q = this.ethplorer.$q
  }

  /* Loads the next batch of 50 transactions, if there are no more transactions the
     promise returns false, if there are more transactions the promise returns true */
  getNextBatch(): angular.IPromise<boolean> {
    let deferred = this.$q.defer<boolean>();
    if (this.endReached) {
      deferred.resolve(false)
    } else {
      // the last timestamp is where we start
      let timestamp = this.pool.length ? this.pool[this.pool.length - 1].timestamp : 0
      // it is mystery that if timestamp less ~1730000000 the response is Invalid timestamp
      timestamp = timestamp == 0 ? 0 : Math.max(timestamp, 1730000000)
      let specificParams
      if (this.newTxsAdded > 0) {
        timestamp = 0
        specificParams = {limit: 2}
      }
      this.ethplorer.getAddressTransactions(this.address, timestamp, null, specificParams).then(
        transactions => {
          let len = this.pool.length
          /* To prevent overlap check if transaction exists before placing in pool */
          transactions.forEach(txn => {
            if (!this.pool.find(tx => tx.hash == txn.hash)) {
              this.pool.push(txn)
            }
          })
          if (len != this.pool.length) {
            this.pool.sort((a, b) => b.timestamp - a.timestamp)
          }
          this.endReached = transactions.length != 50
          deferred.resolve(!this.endReached)
        },
        deferred.reject
      )
    }
    return deferred.promise
  }

  /* Loads more operations and transactions up until we have enough
     entries in our pool to match 'minLength' the length of the pool is returned
     in the promise.
     Note that the max number of transactions is limited to 100 in this version
     so expect minLength to never exceed 150
  */
  ensurePoolLength(minLength: number): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();

    /* We have enough entries in our pool */
    if (this.pool.length > minLength && !(this.newTxsAdded > 0)) {
      deferred.resolve(this.pool.length)
    } else {
      /* Loads and stores in pool the next batch of 50 transactions */
      this.getNextBatch().then(hasMore => {
        if (this.pool.length - 1 > minLength || !hasMore) {
          deferred.resolve(this.pool.length)
        } else {
          // we simply place the next batch to load in here - when supporting unlimited
          // number of transactions this has to updated of course.
          this.getNextBatch().then(hasMore => {
            if (this.pool.length - 1 > minLength || !hasMore) {
              deferred.resolve(this.pool.length)
            } else {
              // we simply place the next batch to load in here - when supporting unlimited
              // number of transactions this has to updated of course.
              this.getNextBatch().then(hasMore => {
                deferred.resolve(this.pool.length)
              }, deferred.reject)
            }
          }, deferred.reject)
        }
      }, deferred.reject)
    }
    return deferred.promise
  }

  /* Transaction count is hardcoded to return max 150 results */
  getCount(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    this.ethplorer.getTransactionCount(this.address).then(
      count => {
        let delta = count - this.pool.length
        this.newTxsAdded = this.endReached ? delta : 0
        this.endReached = delta <= 0
        deferred.resolve(Math.min(count, 1000))
      }, deferred.reject
    )
    return deferred.promise
  }

  getItems(from:number, to:number): angular.IPromise<Array<EthplorerAddressTransaction>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>();
    this.ensurePoolLength(to-1).then( poolLength => {
      let result = []
      for (let i=from; i<to; i++) {
        result.push(this.pool[i])
      }
      deferred.resolve(result)
    }, deferred.reject)
    return deferred.promise
  }
}

@Service('ethplorer')
@Inject('$q', 'http', 'settings','web3')
class EthplorerService implements IEthereumAPIList{
  private providerName = 'Ethplorer'
  public tokenInfoCache: { [key: string]: EthplorerTokenInfo } = {}
  private cachedGetCachedAddressInfo: { [address: string]: any } = {}
  private apiKey: string;
  private static endPoint: string;
  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settingsService: SettingsService,
              private web3: Web3Service) {

    EthplorerService.endPoint = 'https://api.ethplorer.io'
    this.apiKey = 'apiKey=lwA5173TDKj60'

    http.get('https://raw.githubusercontent.com/dmdeklerk/ethereum-lists/master/dist/tokens/eth/tokens-eth.min.json').then(response => {
      let array = angular.isString(response) ? JSON.parse(response) : response
      array.forEach(x => {
        this.tokenInfoCache[x.address] = <any>{
          address: x.address,
          totalSupply: 0,
          name: x.name,
          symbol: x.symbol,
          decimals: x.decimals
        }
      })
    })
  }

  public getProviderName() {return this.providerName;}

  createPaginator(address: string) : EthplorerTransactionPaginator {
    return new EthplorerTransactionPaginator(address, this);
  }

  public getTransactionCount(address: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    this.getCachedAddressInfo(address).then(info => {
      deferred.resolve(info.countTxs)
    }, deferred.reject)
    return deferred.promise;
  }

  public getBalance(address: string): angular.IPromise<string> {
    let deferred = this.$q.defer<string>();
    this.getCachedAddressInfo(address).then(info => {
      deferred.resolve(info.ETH.balance)
    }, deferred.reject)
    return deferred.promise;
  }

  /* Calls ethplorer getAddressInfo and caches the result for 60 seconds,
     this is needed since both the virtual repeat and the erc20 token list call this method
     on page load and refresh */
  private getCachedAddressInfo(address: string): angular.IPromise<EthplorerAddressInfo> {
    let cacheOffEnd = ETHCurrency.cacheOff.get(address) || 0
    if (cacheOffEnd < Date.now()) {
      let v = this.cachedGetCachedAddressInfo[address]
      if (v) return v
    }

    let deferred = this.$q.defer();
    this.cachedGetCachedAddressInfo[address] = deferred.promise
    this.getAddressInfo(address, false).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAddressInfo[address].finally(() => {
      setTimeout(()=> {
        this.cachedGetCachedAddressInfo[address] = null
      }, 40 * 1000)
    })
    return this.cachedGetCachedAddressInfo[address]
  }

  public getAddressInfoUrl(address: string): string {
    return `${EthplorerService.endPoint}/getAddressInfo/${address}?${this.apiKey}&showTxsCount=true`
  }

  public getAddressInfo(address: string, useCache = false): angular.IPromise<EthplorerAddressInfo> {
    if (useCache) {
      return this.getCachedAddressInfo(address)
    }

    let deferred = this.$q.defer<EthplorerAddressInfo>();
    let url = this.getAddressInfoUrl(address)
    this.http.get(url)
        .then((response) => {
          var parsed = angular.isString(response) ? JSON.parse(response) : response;
          if (parsed.error) {
            console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
            deferred.reject(parsed.error)
          }
          else {

            /* Extract all TokenInfo data and persist that to the tokenInfoCache
               this is used for synchronized access to token data based on contract
               address */
            let info: EthplorerAddressInfo = parsed
            if (info.tokens) {
              info.tokens.forEach(token => {
                if (token.tokenInfo) {
                  this.tokenInfoCache[token.tokenInfo.address] = token.tokenInfo
                }
              })
            }
            wlt.saveCurrencyBalance(address, "ETH", info.ETH.balance).then(() => deferred.resolve(info))
          }
        }, (reason) => {
          console.log(`HTTP reject for ${url}: ${reason}`)
          deferred.reject()
        });
    return deferred.promise
  }

  /**
   * These are our raw ether transactions, these include all ETHER transfers plus all
   * token contract invocations but all data is provided as hex encoded data.
   *
   * We paginate through transactions using the unix timestamp which is a number.
   * To get a unix timestamp use
   *
   *    var ts = Math.round((new Date()).getTime() / 1000);
   */
  public getAddressTransactions(address: string, timestamp?: number, showZeroValues?: number, specificParams?: any): angular.IPromise<Array<EthplorerAddressTransaction>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>();
    showZeroValues = showZeroValues || 1
    let url = `${EthplorerService.endPoint}/getAddressTransactions/${address}?${this.apiKey}&limit=${specificParams?.limit || 50}&timestamp=${timestamp}&showZeroValues=${showZeroValues}`
    this.http.get(url)
        .then((response) => {
          let parsed = angular.isString(response) ? JSON.parse(response) : response;
          if (parsed.error) {
            console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
            deferred.resolve([])
          } else {
            parsed?.forEach(tx => {
              /* Is recipient a token contract address ? */
              let tokenInfo = this.tokenInfoCache[tx.to]
              if (tokenInfo) {
                this.fillTokenInfo(tx)
              }
            })
            deferred.resolve(parsed)
          }
        }, (reason) => {
          //console.log(`HTTP reject for ${url}`)
          deferred.reject(reason);
        }, deferred.reject);
    return deferred.promise
  }

  public broadcast(rawTx: string) {
    let deferred = this.$q.defer();
    let url = `https://api.blockcypher.com/v1/eth/main/txs/push?token=d7995959366d4369976aabb3355c7216`
    rawTx = rawTx.startsWith("0x") ? rawTx.substring(2) : rawTx
    this.http.post2(url, {"tx":rawTx}).then((response: any) => {
      response.txId = response.hash;
      deferred.resolve(response)
    }, (e) => {
      deferred.reject( e?.error ? e.error.toString() : 'Error broadcasting transaction')
    })
    return deferred.promise;
  }

  public getTxInfo(txHash: string): angular.IPromise<EthplorerTxInfo> {
    let deferred = this.$q.defer<EthplorerTxInfo>();
    let url = `${EthplorerService.endPoint}/getTxInfo/${txHash}?${this.apiKey}`
    this.http.get(url)
        .then((response) => {
          var parsed = angular.isString(response) ? JSON.parse(response) : response;
          if (parsed.error) {
            console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
            deferred.reject(parsed.error)
          }
          else {
            deferred.resolve(parsed);
          }
        }, error => {
          console.log(`HTTP reject for ${url}`)
          deferred.reject(error)
        });
    return deferred.promise
  }

  fillTokenInfo(tx): void {
    this.getTxInfo(tx.hash).then((info) => {
      if (info.operations) {
        tx.operations = info.operations.map(op => ({
          orig: op,
          type: op.type,
          from: op.from,
          to: op.to,
          value: op.value,
          decimals: op.tokenInfo?.decimals,
          name: op.tokenInfo?.name,
          symbol: op.tokenInfo?.symbol
        }))
      }
    })
  }

  /* This is just a temporory fix to see if Ethplorer APIs are functional */
  public getTopTokens() {
    let deferred = this.$q.defer();
    let url = `${EthplorerService.endPoint}/getTop?${this.apiKey}`;
    this.http.get(url).then((response) => {
      deferred.resolve();
    }, error => {
      deferred.reject()
    }).catch(() => deferred.reject())

    return deferred.promise;
  }

  public getLastBlockHeight() {
    let deferred = this.$q.defer();
    this.http.get(`${EthplorerService.endPoint}/getLastBlock?${this.apiKey}`).then((response) => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response
      if (parsed.error) {
        console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
        deferred.reject(parsed)
      } else {
        deferred.resolve(parsed.lastBlock)
      }
    }, error => {
      deferred.reject(error)
    }).catch((reason) => deferred.reject(reason))

    return deferred.promise;
  }

  getEndPoint(): string {
    return EthplorerService.endPoint
  }

}
