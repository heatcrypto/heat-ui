@Service('ethBlockExplorerService')
@Inject('$q', 'ethplorer', 'ethBlockExplorerHeatNodeService', 'http')
class EthBlockExplorerService implements IEthereumAPIList {

  public ethApiProvider: IEthereumAPIList;
  public tokenInfoCache: { [key: string]: EthplorerTokenInfo } = {}

  constructor(public $q: angular.IQService,
    public ethplorer: EthplorerService,
    public ethBlockExplorerHeatNodeService: EthBlockExplorerHeatNodeService,
    public http: HttpService) {

    setInterval(() => this.refresh(), 5 * 60 * 1000)
  }

  public getProviderName() {return this.ethApiProvider.getProviderName();}

  public refresh() {
    return new Promise((resolve, reject) => {
      this.ethBlockExplorerHeatNodeService.isSyncing().then(() => {
        this.ethApiProvider = this.ethBlockExplorerHeatNodeService;
        resolve()
      }).catch(() => {
        this.ethApiProvider = this.ethplorer;
        resolve()
      }).finally(() => {
        this.tokenInfoCache = this.ethApiProvider.tokenInfoCache;
      })
    })
  }

  public getBalance(address: string) {
    return this.ethApiProvider.getBalance(address)
  }

  public getTxInfo(txId: string) {
    return this.ethApiProvider.getTxInfo(txId);
  }

  public broadcast(rawTx) {
    return this.ethApiProvider.broadcast(rawTx);
  }

  public getTransactionCount(address: string) {
    return this.ethApiProvider.getTransactionCount(address);
  }

  public getAddressTransactions(address: string) {
    return this.ethplorer.getAddressTransactions(address)
  }

  public getAddressInfo(address: string) {
    return this.ethApiProvider.getAddressInfo(address);
  }

}