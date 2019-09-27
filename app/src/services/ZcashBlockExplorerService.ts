@Service('zecBlockExplorerService')
@Inject('http', '$q', '$interval', '$window')
class ZecBlockExplorerService {
  private zcashExplorer: string;

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $interval: angular.IIntervalService,
              private $window: angular.IWindowService) {
    this.zcashExplorer = 'https://explorer.zecmate.com/api';
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.getAddressInfo(address).then(info => {
      if (info) {
        deferred.resolve(info.balance)
      }
      deferred.resolve(0)
    }, ()=> {
      deferred.reject(`Unable to fetch ZEC balance`)
    })
    return deferred.promise
  }

  public getTransactions (address: string, pageNum: number) {
    let deferred = this.$q.defer<any>();
    let url = `${this.zcashExplorer}/txs?address=${address}&pageNum=${pageNum}`
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data.txs)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch ZEC transactions`)
    })
    return deferred.promise
  }

  public getTransactionCount = (address: string): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    this.getAddressInfo(address).then(info => {
      if (info) {
        let totalTransactions = info.txApperances
        deferred.resolve(totalTransactions)
      }
      deferred.resolve(0)
    }, ()=> {
      deferred.reject(`Unable to fetch Zcash transaction count`)
    })
    return deferred.promise
	}

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    let url = `${this.zcashExplorer}/addr/${address}/?noTxList=1`
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch ZEC address data`)
    })
    return deferred.promise
  }

  public getBlockHeight = (): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    let url = `${this.zcashExplorer}/blocks?limit=1`
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data.blocks[0].height)
      }
    }, ()=> {
        deferred.resolve(0)
    })
    return deferred.promise
  }

  public getUnspentUtxos = (addresses): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    if (!Array.isArray(addresses)) {
      addresses = [addresses];
    }
    this.http.post(`${this.zcashExplorer}/addrs/utxo`, {
      addrs: addresses.map((address) => address.toString()).join(',')
    }).then(
      response => {
        try {
          deferred.resolve((<[any]>response).map(data => {
            return ({
              address: data.address ? data.address : undefined,
              txId: data.txid ? data.txid : data.txId,
              outputIndex: !data.vout ? data.outputIndex : data.vout,
              script: data.scriptPubKey || data.script,
              satoshis: data.satoshis
            })
          }))
        } catch (ex) {
          deferred.reject(`Unable to fetch ZEC utxos details`)
        }
      },
      error => {
        deferred.reject(`Unable to fetch ZEC utxos details`)
      }
    )
    return deferred.promise
  }

  public broadcast = (rawTx: string) => {
    return new Promise<{ txId: string }>((resolve, reject) => {
      this.http.post(`${this.zcashExplorer}/tx/send`, { rawtx: rawTx }).then(
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

  public getTxInfo = (txId: string) => {
    let deferred = this.$q.defer<any>();
    let url = `${this.zcashExplorer}/tx/${txId}`
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data)
      }
    }, ()=> {
      deferred.reject('Unable to obtain acoount sequence value');      
    })
    return deferred.promise
  }
}
