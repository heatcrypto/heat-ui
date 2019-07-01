@Service('iotaBlockExplorerService')
@Inject('$q', 'http', '$window')
class IotaBlockExplorerService {
  private url: string;
  private iotaCore;
  private api;
  private cachedGetCachedAccountInfo: Map<string, any> = new Map<string, any>();

  constructor(
    private $q: angular.IQService,
    private http: HttpService,
    private $window: angular.IWindowService) {

    this.iotaCore = $window.heatlibs.IotaCore;
    this.setUrl()
  }

  public setUrl(url = 'https://nodes.thetangle.org:443') {
    this.url = url;
    this.api = this.iotaCore.composeAPI({
      provider: 'https://nodes.thetangle.org:443'
    });
  }

  private getTransactions = (seed: string, startKeyIndex: number = 0, security: number = 2) => {
    let deferred = this.$q.defer<IotaGetAccount>();
    this.api.getAccountData(seed, { startKeyIndex, security }).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.transfers) {
        deferred.resolve(data)
      }
      else
        deferred.reject(`Unable to fetch IOTA address data`)
    });
    return deferred.promise;
  }

  private getCachedAccountInfo = (seed: string, startKeyIndex: number = 0, security: number = 2) => {
    if (this.cachedGetCachedAccountInfo.get(seed))
      return this.cachedGetCachedAccountInfo.get(seed)

    let deferred = this.$q.defer<IotaGetAccount>();
    this.cachedGetCachedAccountInfo.set(seed, deferred.promise)
    this.getTransactions(seed).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAccountInfo.get(seed).finally(() => {
      setTimeout(() => {
        this.cachedGetCachedAccountInfo.set(seed, null);
      }, 30 * 1000)
    })
    return this.cachedGetCachedAccountInfo.get(seed)
  }

  public getAccountInfo = (seed: string, startKeyIndex: number = 0, security: number = 2) => {
    let deferred = this.$q.defer<IotaGetAccount>();
    this.getCachedAccountInfo(seed, startKeyIndex, security).then(info => {
      deferred.resolve(info)
    }, deferred.reject)
    return deferred.promise;
  }

  public sendIota = (seed: string, transfers: any[]) => {
    let deferred = this.$q.defer<any>();
    const depth = 3
    const minWeightMagnitude = 9

    this.api.prepareTransfers(seed, transfers)
      .then(trytes => this.api.sendTrytes(trytes, depth, minWeightMagnitude))
      .then(bundle => deferred.resolve(bundle))
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.api.getBalances([address], 100)
      .then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
        deferred.resolve(data.balances[0])
      })
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public getAddressBundles = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.api.getBundlesFromAddresses([address])
      .then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
        deferred.resolve(data)
      })
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public checkAddressReuse = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.getAddressBundles(address).then(bundles => {
      bundles.forEach(transactions => {
        transactions.forEach(tx => {
          if (tx.address === address && tx.value < 0) {
            deferred.resolve(true)
            return true;
          }
        });
      });
      deferred.resolve(false)
    }).catch(err => {
      deferred.reject(err)
    })
    return deferred.promise;
  }
}

interface IotaGetAccount {
  transactions: any[],
  transfers: any[],
  balance: number
}
