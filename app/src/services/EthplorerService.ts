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

interface EthplorerTokenInfo {
  address: string;
  totalSupply: string;
  name: string;
  symbol: string;
  decimals: number;
  // token price (false, if not available)
  price: {
    rate: string;
    currency: string;
    diff: number;
    ts: number;
  };
  owner: string;
  countOps: string;
  totalIn: number;
  totalOut: number;
  holdersCount: number;
  issuancesCount: number;
}

interface EthplorerAddressInfo {
  address: string;
  ETH: {
    balance: string;
    totalIn: string;
    totalOut: string;
  };
  // exists if specified address is a contract
  contractInfo: {
    creatorAddress: string;
    transactionHash: string;
    timestamp: number;
  };
  // exists if specified address is a token contract address (same format as token info),
  tokenInfo: EthplorerTokenInfo;
  // exists if specified address has any token balances
  tokens: Array<{
    tokenInfo: EthplorerTokenInfo;
    // token balance (as is, not reduced to a floating point value)
    balance: string;
    totalIn: string;
    totalOut: string;
  }>;
  // Total count of incoming and outcoming transactions (including creation one)
  countTxs: number;
}

/* These are all address transactions including 0x txns  */
interface EthplorerAddressTransaction {
  // operation timestamp
  timestamp: number
  // source address (if two addresses involved)
  from: string
  // destination address (if two addresses involved)
  to: string
  // transaction hash
  hash: string
  // ETH value (as is, not reduced to a floating point value)
  value: string
  // input data
  input: string
  // true if transactions was completed, false if failed
  success: boolean
}

/* These are all address operations, these contain parsed input data turned into operations */
interface EthplorerAddressHistoryOperation {
  // operation timestamp
  timestamp: number
  transactionHash: string;
  // token data (same format as token info)
  tokenInfo: EthplorerTokenInfo
  // operation type (transfer, approve, issuance, mint, burn, etc)
  type: string
  // operation target address (if one)
  address: string
  // source address (if two addresses involved),
  from: string
  // destination address (if two addresses involved),
  to: string
  // operation value (as is, not reduced to a floating point value),
  value: string
}

interface EthplorerTxInfo {
  // transaction hash
  hash: string
  // transaction block time
  timestamp: number
  // transaction block number
  blockNumber: number
  // number of confirmations
  confirmations: number
  // true if there were no errors during tx execution
  success: boolean
  // source address
  from: string
  // destination address
  to: string
  // ETH send value
  value: string
  // transaction input data (hex)
  input: string
  // gas limit set to this transaction
  gasLimit: string
  // gas used for this transaction
  gasUsed: string
}

class EthplorerTransactionPaginator {
  private $q: angular.IQService
  private pool: Array<EthplorerAddressTransaction> = []
  private endReached = false

  constructor(private address: string, private ethplorer: EthplorerService) {
    this.$q = this.ethplorer.$q
  }

  /* Loads the next batch of 50 transactions, if there are no more transactions the
     promise returns false, if there are more transactions the promise returns true */
  getNextBatch(): angular.IPromise<boolean> {
    let deferred = this.$q.defer<boolean>();
    if (this.endReached) {
      deferred.resolve(false)
    }
    else {
      // the last timestamp is where we start
      let timestamp = this.pool.length ? this.pool[this.pool.length-1].timestamp : 0
      this.ethplorer.getAddressTransactions(this.address, timestamp).then(
        transactions => {
          /* To prevent overlap check if transaction exists before placing in pool */
          transactions.forEach(txn => {
            if (!this.pool.find(tx => tx.hash == txn.hash)) {
              this.pool.push(txn)
            }
          })
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
    if (this.pool.length > minLength) {
      deferred.resolve(this.pool.length)
    }
    else {
      /* Loads and stores in pool the next batch of 50 transactions */
      this.getNextBatch().then(hasMore => {
        if (this.pool.length-1 > minLength || !hasMore) {
          deferred.resolve(this.pool.length)
        }
        else {

          // we simply place the next batch to load in here - when supporting unlimited
          // number of transactions this has to updated of course.

          this.getNextBatch().then(hasMore => {
            if (this.pool.length-1 > minLength || !hasMore) {
              deferred.resolve(this.pool.length)
            }
            else {

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
    this.ethplorer.getEthplorerTransactionCount(this.address).then(
      count => {
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
class EthplorerService {

  public tokenInfoCache: {[key:string]: EthplorerTokenInfo} = {}
  private cachedGetCachedAddressInfo = null

  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settingsService: SettingsService,
              private web3: Web3Service) {
    http.get('https://raw.githubusercontent.com/dmdeklerk/ethereum-lists/master/dist/tokens/eth/tokens-eth.min.json').then(response => {
      let array = angular.isString(response) ? JSON.parse(response) : response
      array.forEach(x => {
        this.tokenInfoCache[x.address] = <any> {
          address: x.address,
          totalSupply: 0,
          name: x.name,
          symbol: x.symbol,
          decimals: x.decimals
        }
      })
    })
  }

  createPaginator(address: string) : EthplorerTransactionPaginator {
    return new EthplorerTransactionPaginator(address, this);
  }

  public getErc20Tokens(address: string): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    this.getCachedAddressInfo(address).then(response => {
      deferred.resolve(response)
    }, err => {
      console.log(err)
      deferred.resolve([])
    })
    return deferred.promise
  }

  public getEthplorerTransactionCount(address: string): angular.IPromise<number> {
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

  /* Calls ethplorer getAddressInfo and caches the result for 10 seconds,
     this is needed since both the virtual repeat and the erc20 token list call this method
     on page load and refresh */
  private getCachedAddressInfo(address: string): angular.IPromise<EthplorerAddressInfo> {
    if (this.cachedGetCachedAddressInfo)
      return this.cachedGetCachedAddressInfo

    let deferred = this.$q.defer();
    this.cachedGetCachedAddressInfo = deferred.promise
    this.getAddressInfo(address).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAddressInfo.finally(() => {
      setTimeout(()=> {
        this.cachedGetCachedAddressInfo = null
      }, 5*1000)
    })
    return this.cachedGetCachedAddressInfo
  }

  public getAddressInfo(address: string): angular.IPromise<EthplorerAddressInfo> {
    let deferred = this.$q.defer<EthplorerAddressInfo>();
    let url = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=lwA5173TDKj60`
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

            deferred.resolve(info);
          }
        }, () => {
          console.log(`HTTP reject for ${url}`)
          deferred.reject(null);
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
  public getAddressTransactions(address: string, timestamp: number, showZeroValues?: number): angular.IPromise<Array<EthplorerAddressTransaction>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>();
    showZeroValues = showZeroValues || 1
    let url = `https://api.ethplorer.io/getAddressTransactions/${address}?apiKey=lwA5173TDKj60&limit=50&timestamp=${timestamp}&showZeroValues=${showZeroValues}`
    this.http.get(url)
        .then((response) => {
          var parsed = angular.isString(response) ? JSON.parse(response) : response;
          if (parsed.error) {
            console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
            deferred.resolve([])
          }
          else {
            deferred.resolve(parsed);
          }
        }, () => {
          console.log(`HTTP reject for ${url}`)
          deferred.resolve([]);
        });
    return deferred.promise
  }

  /**
   * [[
   *    THIS IS NOT USED AT THIS TIME, WE USE RAW TRANSACTIONS INSTEAD WHICH WE PARSE.
   *    TOKEN NAMES, SYMBOLS AND DECIMALS ARE OBTAINED THROUGH getAddressInfo AND
   *    ARE CACHED FOR SYNCED ACCESS FROM TXN RENDER SERVICE
   * ]]
   *
   * These are our token operations, these are constructed by parsing the transactions inputs
   * and are collected by ethplorer.
   *
   * Pagination happens through timestamp param.
   */
  public getAddressHistory(address: string, timestamp: number): angular.IPromise<Array<EthplorerAddressHistoryOperation>> {
    let deferred = this.$q.defer<Array<EthplorerAddressHistoryOperation>>();
    let url = `https://api.ethplorer.io/getAddressHistory/${address}?apiKey=lwA5173TDKj60&limit=10&timestamp=${timestamp}`
    this.http.get(url)
        .then((response) => {
          var parsed = angular.isString(response) ? JSON.parse(response) : response;
          if (parsed.error) {
            console.log(`Ethplorer Error: ${JSON.stringify(parsed)}`)
            deferred.resolve([])
          }
          else {
            deferred.resolve(parsed.operations);
          }
        }, () => {
          console.log(`HTTP reject for ${url}`)
          deferred.resolve([]);
        });
    return deferred.promise
  }

  public getTxInfo(txHash: string): angular.IPromise<EthplorerTxInfo> {
    let deferred = this.$q.defer<EthplorerTxInfo>();
    let url = `https://api.ethplorer.io/getTxInfo/${txHash}?apiKey=lwA5173TDKj60`
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

}