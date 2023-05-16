@Service('ethBlockExplorerService')
@Inject('$q', 'ethplorer', 'ethBlockExplorerHeatNodeService', 'http', 'web3')
class EthBlockExplorerService implements IEthereumAPIList {

  public ethApiProvider: IEthereumAPIList;
  public tokenInfoCache: { [key: string]: EthplorerTokenInfo } = {}

  constructor(public $q: angular.IQService,
    public ethplorer: EthplorerService,
    public ethBlockExplorerHeatNodeService: EthBlockExplorerHeatNodeService,
    public http: HttpService,
    private web3: Web3Service) {

    setInterval(() => this.refresh(), 5 * 60 * 1000)
  }

  public getProviderName() { return this.ethApiProvider.getProviderName(); }

  public refresh() {
    return new Promise((resolve, reject) => {
      this.ethBlockExplorerHeatNodeService.isSyncing().then(() => {
        this.ethApiProvider = this.ethBlockExplorerHeatNodeService;
      }).catch(() => {
        this.ethApiProvider = this.ethplorer;
      }).finally(() => {
        this.tokenInfoCache = this.ethApiProvider.tokenInfoCache;
        resolve(null)
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

  public getAddressTransactions(address: string, pageNum: number) {
    let deferred = this.$q.defer<any>();
    if (this.ethApiProvider.getProviderName() === 'HEAT') {
      this.ethApiProvider.getAddressTransactions(address, pageNum).then((response) => {
        this.convertAddressTransactions(response)
        deferred.resolve(response)
      })
    } else {
      this.ethApiProvider.getAddressTransactions(address).then((response) => deferred.resolve(response))
    }
    return deferred.promise;

  }

  public getAddressInfo(address: string, useCache = false) {
    return this.ethApiProvider.getAddressInfo(address, useCache);
  }

  private convertAddressTransactions(transactions) {
    transactions.forEach(tx => {
      tx.from = tx.vin[0].addresses[0];
      tx.to = tx.vout[0].addresses[0];
      tx.hash = tx.txid;
      tx.value = this.web3.web3.fromWei(tx.vout[0].value, 'ether');
      tx.input = '';
      tx.success = '';
      tx.timestamp = tx.blockTime;
    });
  }

}
