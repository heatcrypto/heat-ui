
@Service('btcBlockExplorerService')
@Inject('http', '$q', 'btcBlockExplorerHeatNodeService', 'btcBlockExplorer3rdPartyService', '$interval')
class BtcBlockExplorerService {

  private btcProvider: IBitcoinAPIList;
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private btcBlockExplorerHeatNodeService: BtcBlockExplorerHeatNodeService,
              private btcBlockExplorer3rdPartyService: BtcBlockExplorer3rdPartyService,
              private $interval: angular.IIntervalService) {
    let interval = $interval(() => { this.refresh() }, 60 * 1000, 0, false);
  }

  public refresh = () => {
    return this.btcBlockExplorerHeatNodeService.getGenesisBlock().then(() => {
      this.btcProvider = this.btcBlockExplorerHeatNodeService;
    }, () => {
      this.btcProvider = this.btcBlockExplorer3rdPartyService;
    })
  }

  public getBalance = (address: string) => {
    return this.btcProvider.getBalance(address)
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
    return this.btcProvider.getTxInfo(rawTx)
  }

  public getUnspentUtxos = (from: string) :  any => {
    return this.btcProvider.getTxInfo(from)
  }
}