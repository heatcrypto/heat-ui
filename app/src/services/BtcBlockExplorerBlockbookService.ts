
@Service('btcBlockExplorerBlockbookService')
@Inject('http', '$q', '$window')
class BtcBlockExplorerBlockbookService implements IBitcoinAPIList {

  static endPoint: Function;
  private bitcore;

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $window: angular.IWindowService) {
    BtcBlockExplorerBlockbookService.endPoint = () =>
        wlt.CURRENCIES.Bitcoin.network == 'testnet' ? 'https://tbtc1.trezor.io/api/v2' : 'https://btc1.heatwallet.com/api/v2'
    this.bitcore = $window.heatlibs.bitcore
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<number>();
    this.getAddressInfo(address).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError) {
        deferred.reject()
      }
      deferred.resolve(parseInt(parsed.balance) + parseInt(parsed.unconfirmedBalance))
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getTransactions = (address: string, from: number, to: number): angular.IPromise<any> => {
    //let getTransactionsApi = `${BtcBlockExplorerBlockbookService.endPoint()}/addrs/${address}/txs?from=${from}&to=${to}`;
    const pageSize = to - from
    const page = Math.round(to / pageSize)
    let getTransactionsApi = `${BtcBlockExplorerBlockbookService.endPoint()}/address/${address}?details=txs&page=${page}&pageSize=${pageSize}`
    let deferred = this.$q.defer()
    this.http.get(getTransactionsApi).then(response => {
      if (!response) {
        deferred.reject("empty response")
      } else {
        let parsed = utils.parseResponse(response)
        if (parsed.heatUtilParsingError) deferred.reject()
        deferred.resolve(parsed.transactions)
      }
    }, (reason) => {
      deferred.reject(reason)
    })
    return deferred.promise
  }

  public getAddressInfo = (address: string, onlyBalance?): angular.IPromise<any> => {
    let details = onlyBalance ? 'details=basic' : 'details=txids'
    let url = `${BtcBlockExplorerBlockbookService.endPoint()}/address/${address}?${details}`
    let deferred = this.$q.defer<any>()
    this.http.get(url, true).then(response => {
      let parsed = utils.parseResponse(response)
      if (parsed.heatUtilParsingError) deferred.reject(parsed.heatUtilParsingError)
      let unconfirmedBalance = parseInt(parsed.balance) + parseInt(parsed.unconfirmedBalance)
      wlt.saveCurrencyBalance(address, "BTC", parsed.balance, unconfirmedBalance.toString()).then(() => deferred.resolve(parsed))
    }, (reason) => {
      deferred.reject(reason);
    })
    return deferred.promise
  }

  //there is the alternative BtcFeeService.getSatByteFee
  public getEstimatedFee = (feeBlocks = 1) => {
    let url = BtcBlockExplorerBlockbookService.endPoint() + `/estimatefee/${feeBlocks}`;
    let deferred = this.$q.defer();
    let btcKByteFee = 0.0002;
    this.http.get(url, true).then(response => {
      let parsed = utils.parseResponse(response)
      if (parsed.heatUtilParsingError) deferred.reject(parsed.heatUtilParsingError)
      btcKByteFee = parsed.result
      if (!btcKByteFee) btcKByteFee = 20
      deferred.resolve(btcKByteFee);
    }, (reason) => {
      console.log("error response on getting fee for btc. " + reason)
      deferred.resolve(btcKByteFee);
    })
    return deferred.promise
  }

  public getTxInfo = (txId: string) => {
    let getTxInfoApi = `${BtcBlockExplorerBlockbookService.endPoint()}/tx/${txId}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getLatestBlockHash = () => {
    let getLatestBlockHash = `${BtcBlockExplorerBlockbookService.endPoint()}/status?q=getLastBlockHash`
    let deferred = this.$q.defer<any>();
    this.http.get(getLatestBlockHash).then(response => {
      let parsed = utils.parseResponse(response)
      deferred.resolve(parsed.lastblockhash);
    }, () => {
      deferred.reject();
    }).catch(()=> {
      deferred.reject()
    })
    return deferred.promise
  }

  public isBlockchainSyncing = () => {
    let deferred = this.$q.defer<any>();
    this.getLatestBlockHash().then(blockHash => {
      this.getBlockByHash(blockHash).then(response => {
        let parsed = utils.parseResponse(response)
        if(utils.isTimeWithinThreasholdLimit(parsed.time))
          deferred.resolve()
        else
          deferred.reject()
      })
    }).catch(()=> {
      deferred.reject()
    })
    return deferred.promise
  }

  public getBlockByHash = (blockHash) => {
    let getBlockByHash = `${BtcBlockExplorerBlockbookService.endPoint()}/block/${blockHash}`
    let deferred = this.$q.defer<any>();
    this.http.get(getBlockByHash).then(response => {
      let parsed = utils.parseResponse(response)
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getUnspentUtxos(addresses) {
    const Address = this.bitcore.Address;
    const Transaction = this.bitcore.Transaction;
    const Script = this.bitcore.Script;
    const UnspentOutput = Transaction.UnspentOutput;
    const that = this

    // should return a Promise that returns an array of UnspentOutput https://github.com/bitpay/bitcore-lib/blob/master/docs/unspentoutput.md
    // utxos should be looked up on blockbook api through https://github.com/trezor/blockbook/blob/master/docs/api.md#get-utxo
    function getUtxos(address): Promise<any> {
      return new Promise((resolve, reject) => {
        const getUnspentUtxos = `${BtcBlockExplorerBlockbookService.endPoint()}/utxo/${address}?confirmed=true`
        that.http.get(getUnspentUtxos).then(response => {
          const parsed = utils.parseResponse(response)
          const utxos = []
          if (Array.isArray(parsed)) {
            parsed.forEach(_utxo => {
              const utxo = new UnspentOutput({
                "txid" : _utxo.txid,
                "vout" : _utxo.vout,
                "address" : address,
                "script" : Script.buildPublicKeyHashOut(address).toString(),
                "amount" : utils.formatQNT(_utxo.value)
              });
              utxos.push(utxo)
            })
          }
          resolve(utxos)
        }, (e) => {
          reject(e);
        }).catch(e=> {
          reject(e)
        })
      })
    }

    return new Promise((resolve, reject) => {
      if (!Array.isArray(addresses)) {
        addresses = [addresses];
      }
      addresses = addresses.map((address) => new Address(address));
      const utxos = []
      const promises = addresses.map(address => getUtxos(address).then(_utxos => _utxos.forEach(utxo => utxos.push(utxo))));
      Promise.all(promises).then(
        () => resolve(utxos),
        error => reject(error)
      )
    })
  }

  public getUtxos(addresses: [string]): Promise<any[]> {
    const getUtxos = (address): Promise<any> => new Promise((resolve, reject) => {
      //const getUnspentUtxos = `${BtcBlockExplorerBlockbookService.endPoint()}/utxo/${address}?confirmed=true`
      const getUnspentUtxos = `${BtcBlockExplorerBlockbookService.endPoint()}/utxo/${address}`
      this.http.get(getUnspentUtxos).then(response => {
        const parsed = utils.parseResponse(response)
        if (Array.isArray(parsed)) {
          let txHexes = parsed.map(utxo => this.getTxInfo(utxo.txid).then(txInfo => utxo.txhex = txInfo.hex))
          Promise.all(txHexes).then(
              () => resolve(parsed),
              error => reject(error)
          )
        } else {
          resolve([])
        }
      }, (e) => {
        reject(e)
      }).catch(e => {
        reject(e)
      })
    })

    return new Promise<any[]>((resolve, reject) => {
      const utxos = []
      const promises = addresses.map(address => getUtxos(address).then(_utxos => _utxos.forEach(utxo => utxos.push(utxo))))
      Promise.all(promises).then(
        () => resolve(utxos),
        error => reject(error)
      )
    })
  }

  public broadcast = (rawTx: string) => {
    return new Promise<{ txId: string }>((resolve, reject) => {
      this.http.get(`${BtcBlockExplorerBlockbookService.endPoint()}/sendtx/${rawTx}`).then(
        response => {
          let responseObj: any
          try {
            responseObj = typeof response === 'string' ? JSON.parse(response) : response
          } catch (e) {
            responseObj = response
          }
          if (responseObj.result) {
            resolve({ txId: responseObj.result })
          } else if (responseObj.error && responseObj.error.message) {
            reject({
              message: responseObj.error.message
            })
          } else {
            let responseStr = typeof response === 'string' ? response : JSON.stringify(response)
            console.log('Broadcast response', response)
            reject({
              message: 'Response: ' + responseStr
            })
          }
        },
        error => {
          if (angular.isString(error)) {
            reject({message:error})
          }
          else if (angular.isObject(error) && error != null) {
            reject(error.message || error.error)
          }
          else {
            reject(JSON.stringify(error))
          }
        }
      )
    })
  }

}