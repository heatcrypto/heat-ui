
@Service('btcBlockExplorerService')
@Inject('$q', 'btcBlockExplorerHeatNodeService', 'btcBlockExplorer3rdPartyService')
class BtcBlockExplorerService {

  private btcProvider: IBitcoinAPIList;
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();
  constructor(private $q: angular.IQService,
              private btcBlockExplorerHeatNodeService: BtcBlockExplorerHeatNodeService,
              private btcBlockExplorer3rdPartyService: BtcBlockExplorer3rdPartyService) {

    setInterval(() => this.refresh(), 5 * 60 * 1000)
  }

  public refresh = () => {
    let btcServer = SettingsService.getCryptoServer('BTC')
    let timeoutPromise = new Promise((resolve, reject) => {
      let wait = setTimeout(() => {
        clearTimeout(wait);
        resolve({provider: this.btcBlockExplorer3rdPartyService, properties: [{name: 'priority',value: 2}]});
      }, btcServer.timeout)
    })

    let apiPromise = new Promise((resolve, reject) => {

      this.btcBlockExplorerHeatNodeService.isBlockchainSyncing().then(() => {
        resolve({provider: this.btcBlockExplorerHeatNodeService, properties: [{name: 'status',value: 'INACTIVE'}, {name: 'priority',value: 2}]});
      }, () => {
        resolve({provider: this.btcBlockExplorer3rdPartyService, properties: [{name: 'status',value: 'INACTIVE'}]});
      }).catch(() => {
        resolve({provider: this.btcBlockExplorer3rdPartyService, properties: [{name: 'status',value: 'INACTIVE'}]});
      })
    })

    return Promise.race([apiPromise, timeoutPromise]).then((resolved: any)=> {
      this.changeProvider(resolved.provider)
      resolved.properties.forEach(property => {
        SettingsService.changeCryptoNodeProperty('BTC', 'https://bitnode.heatwallet.com/insight-api', property.name, property.value)
      });
    })
  }

  private changeProvider(newProvider: any) {
    this.btcProvider = newProvider
  }

  private getCachedAccountBalance = (address: string) => {
    if (this.cachedGetCachedAccountBalance.get(address))
      return this.cachedGetCachedAccountBalance.get(address)
    let deferred = this.$q.defer<number>();
    this.cachedGetCachedAccountBalance.set(address, deferred.promise)
    this.btcProvider.getBalance(address).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAccountBalance.get(address).finally(() => {
      setTimeout(() => {
        this.cachedGetCachedAccountBalance.set(address, null);
      }, 30 * 1000)
    })
    return this.cachedGetCachedAccountBalance.get(address)
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<number>();
    this.getCachedAccountBalance(address).then(info => {
      deferred.resolve(info)
    }, deferred.reject)
    return deferred.promise;
  }

  public getTransactions = (address: string, from: number, to: number): angular.IPromise<any> => {
    return this.btcProvider.getTransactions(address, from, to)
  }

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    this.btcProvider.getAddressInfo(address).then(info => {
      let data = Update3rdPartyAPIResponsesUtil.updateBTCGetAddressInfo(info, this.btcProvider)
      deferred.resolve(data)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getEstimatedFee = () => {
    return this.btcProvider.getEstimatedFee()
  }

  public getTxInfo = (txId: string) => {
    let deferred = this.$q.defer<any>();
    this.btcProvider.getTxInfo(txId).then(info => {
      let data = Update3rdPartyAPIResponsesUtil.updateBTCGetTxInfo(info, this.btcProvider)
      deferred.resolve(data)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public broadcast = (rawTx: string): any => {
    return this.btcProvider.broadcast(rawTx)
  }

  public getUnspentUtxos = (from: string): any => {
    return this.btcProvider.getUnspentUtxos(from)
  }
}