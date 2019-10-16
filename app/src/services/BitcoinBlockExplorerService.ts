
@Service('btcBlockExplorerService')
@Inject('http', '$q', 'btcBlockExplorerHeatNodeService', 'btcBlockExplorer3rdPartyService')
class BtcBlockExplorerService {

  private btcProvider: IBitcoinAPIList;
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private btcBlockExplorerHeatNodeService: BtcBlockExplorerHeatNodeService,
              private btcBlockExplorer3rdPartyService: BtcBlockExplorer3rdPartyService) {
  }

  public refresh = () => {
    return this.btcBlockExplorerHeatNodeService.isBlockchainSyncing().then(() => {
      this.btcProvider = this.btcBlockExplorerHeatNodeService;
    }, () => {
      this.btcProvider = this.btcBlockExplorer3rdPartyService;
    }).catch(()=> {
      this.btcProvider = this.btcBlockExplorer3rdPartyService;
    })
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
    }, ()=> {
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
    }, ()=> {
      deferred.reject()
    })
    return deferred.promise
  }

  public broadcast = (rawTx: string) : any => {
    return this.btcProvider.broadcast(rawTx)
  }

  public getUnspentUtxos = (from: string) :  any => {
    return this.btcProvider.getUnspentUtxos(from)
  }
}