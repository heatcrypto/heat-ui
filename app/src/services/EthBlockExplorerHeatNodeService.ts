@Service('ethBlockExplorerHeatNodeService')
@Inject('$q', 'http', 'settings')
class EthBlockExplorerHeatNodeService implements IEthereumAPIList {

  private static endPoint: string;
  public tokenInfoCache: { [key: string]: EthplorerTokenInfo } = {}
  private providerName = 'HEAT';

  constructor(public $q: angular.IQService,
    private http: HttpService,
    private settingsService: SettingsService) {
    // get settings after it is initialized (read config files)
    EthBlockExplorerHeatNodeService.endPoint = 'https://eth1.heatwallet.com/api/v2'

    http.get('https://raw.githubusercontent.com/dmdeklerk/ethereum-lists/master/dist/tokens/eth/tokens-eth.min.json').then(response => {
      let array = angular.isString(response) ? JSON.parse(response) : response
      array.forEach(x => {
        this.tokenInfoCache[x.address] = <any>{
          address: x.address,
          totalSupply: 0,
          name: x.name,
          symbol: x.symbol,
          decimals: x.decimals
        }
      })
    })
  }

  public getProviderName() {return this.providerName;}

  public isSyncing() {
    let deferred = this.$q.defer();
    this.http.get(EthBlockExplorerHeatNodeService.endPoint).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if (parsed && parsed.blockbook && parsed.blockbook.inSync && parsed.blockbook.coin === 'Ethereum')
        deferred.resolve()
      else
        deferred.reject()
    }, () => {
      deferred.reject();
    }).catch(() => deferred.reject())
    return deferred.promise;
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    this.getAddressInfo(address).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let balance = (parsed.balance / 1000000000000000000).toString();
      deferred.resolve(balance)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getTransactionCount(address: string) {
    let getTxInfoApi = `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}?details=basics`;
    let deferred = this.$q.defer<number>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txs);
    }, (e) => {
      console.log(e)
      deferred.reject(e);
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getTxInfoApi = `${EthBlockExplorerHeatNodeService.endPoint}/tx/${txId}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public broadcast(txObject) {
    let sendTxApi = `${EthBlockExplorerHeatNodeService.endPoint}/sendtx/${txObject}`;
    let deferred = this.$q.defer<any>();
    this.http.get(sendTxApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.data);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }

  public getAddressInfo(address: string): angular.IPromise<EthplorerAddressInfo> {
    let deferred = this.$q.defer<EthplorerAddressInfo>();
    let url = `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}?details=tokenBalances`
    this.http.get(url).then((response) => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if (parsed.tokens) {
        parsed.tokens.forEach(token => {
          let tokenInfo = {
            address: token.contract,
            decimals: token.decimals,
            symbol: token.symbol,
            name: token.name
          }
          token.tokenInfo = tokenInfo;
          this.tokenInfoCache[token.tokenInfo.address] = token.tokenInfo
        })
      }
      parsed.ETH = {}
      parsed.ETH.balance = parsed.balance / 1000000000000000000;
      deferred.resolve(parsed);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }

  public getAddressTransactions(address: string, pageNum?: number): angular.IPromise<Array<EthplorerAddressTransaction>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>();
    let getTransactionsApi = `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}?details=txs&page=${pageNum}&pageSize=10`;
    this.http.get(getTransactionsApi).then((response) => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if(parsed.transactions && parsed.transactions.length > 0)
        deferred.resolve(parsed.transactions)
      deferred.resolve([])
    }, () => {
      deferred.reject();
    });
    return deferred.promise
  }
}