
@Service('btcBlockExplorerHeatNodeService')
@Inject('http', '$q', '$window')
class BtcBlockExplorerHeatNodeService implements IBitcoinAPIList {

  static endPoint: string;
  private bitcore;

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $window: angular.IWindowService) {
    BtcBlockExplorerHeatNodeService.endPoint = 'https://bitnode.heatwallet.com/insight-api';
    this.bitcore = $window.heatlibs.bitcore;
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<number>();
    this.getAddressInfo(address).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed.balanceSat + parsed.unconfirmedBalanceSat)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getTransactions = (address: string, from: number, to: number): angular.IPromise<any> => {
    let getTransactionsApi = `${BtcBlockExplorerHeatNodeService.endPoint}/addrs/${address}/txs?from=${from}&to=${to}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed.items)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let getTransactionsApi = `${BtcBlockExplorerHeatNodeService.endPoint}/addr/${address}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee = () => {
    let getEstimatedFeeApi = `https://bitcoinfees.earn.com/api/v1/fees/list`;
    let deferred = this.$q.defer();
    let fee = 20;
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      parsed.fees.forEach(feeObject => {
        if (feeObject.maxDelay == 1) {
          fee = feeObject.minFee
        }
      });
      if (!fee)
        fee = 20
      deferred.resolve(fee);
    }, () => {
      deferred.resolve(fee);
    })
    return deferred.promise
  }

  public getTxInfo = (txId: string) => {
    let getTxInfoApi = `${BtcBlockExplorerHeatNodeService.endPoint}/tx/${txId}`;
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
    let getLatestBlockHash = `${BtcBlockExplorerHeatNodeService.endPoint}/status?q=getLastBlockHash`
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
    let getBlockByHash = `${BtcBlockExplorerHeatNodeService.endPoint}/block/${blockHash}`
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
    const UnspentOutput = Transaction.UnspentOutput;
    return new Promise((resolve, reject) => {
      if (!Array.isArray(addresses)) {
        addresses = [addresses];
      }
      addresses = addresses.map((address) => new Address(address));
      this.http.post(`${BtcBlockExplorerHeatNodeService.endPoint}/addrs/utxo`, {
        addrs: addresses.map((address) => address.toString()).join(',')
      }).then(
        response => {
          try {
            resolve((<[any]>response).map(unspent => new UnspentOutput(unspent)))
          } catch (ex) {
            reject(ex);
          }
        },
        error => {
          reject(error)
        }
      )
    })
  }

  public broadcast = (rawTx: string) => {
    return new Promise<{ txId: string }>((resolve, reject) => {
      this.http.post(`${BtcBlockExplorerHeatNodeService.endPoint}/tx/send`, { rawtx: rawTx }).then(
        response => {
          let txId = response ? response['txid'] : null
          resolve({ txId: txId })
        },
        error => {
          reject(error)
        }
      )
    })
  }
}