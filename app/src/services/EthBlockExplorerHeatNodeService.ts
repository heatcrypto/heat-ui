@Service('ethBlockExplorerHeatNodeService')
@Inject('$q', 'http', 'settings', 'web3')
class EthBlockExplorerHeatNodeService implements IEthereumAPIList {

  private static endPoint: string;
  public tokenInfoCache: { [key: string]: EthplorerTokenInfo } = {}
  private providerName = 'HEAT';
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();
  private cachedAddressInfo: Map<string, any> = new Map<string, any>();

  constructor(public $q: angular.IQService,
    private http: HttpService,
    private settingsService: SettingsService,
    private web3: Web3Service) {
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
    let deferred = this.$q.defer()
    this.http.get(EthBlockExplorerHeatNodeService.endPoint).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if (parsed && parsed.blockbook && parsed.blockbook.inSync && parsed.blockbook.coin === 'Ethereum') {
        deferred.resolve()
      } else {
        deferred.reject()
      }
    }, () => {
      deferred.reject();
    }).catch(() => deferred.reject())
    return deferred.promise
  }

  public getBalanceFromChain(address: string): angular.IPromise<string> {
    let deferred = this.$q.defer<string>();
    this.getAddressInfo(address).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.balance)
    }, () => {
      deferred.resolve("0")
    })
    return deferred.promise
  }

  private getCachedAccountBalance = (address: string) => {
    let v = this.cachedGetCachedAccountBalance.get(address)
    if (v) return v
    let deferred = this.$q.defer<string>();
    this.cachedGetCachedAccountBalance.set(address, deferred.promise)
    this.getBalanceFromChain(address).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAccountBalance.get(address).finally(() => {
      setTimeout(() => {
        this.cachedGetCachedAccountBalance.set(address, null);
      }, 30 * 1000)
    })
    return this.cachedGetCachedAccountBalance.get(address)
  }

  public getBalance = (address: string): PromiseLike<string> => {
    let deferred = this.$q.defer<string>();
    this.getCachedAccountBalance(address).then(parsed=> {
      let balance = this.web3.web3.fromWei(parsed, 'ether')
      deferred.resolve(balance)
    })
    return deferred.promise;
  }

  public getTransactionCount(address: string): PromiseLike<number> {
    let getTxInfoApi = `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}?details=basics`;
    let deferred = this.$q.defer<number>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txids?.length || parsed.txs);
    }, (e) => {
      console.log(e)
      deferred.reject(e);
    })
    return deferred.promise
  }

  public getTxInfo(txId: string): PromiseLike<any> {
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
    this.http.get(sendTxApi).then((response: any) => {
      let r = angular.isString(response) ? JSON.parse(response) : response;
      if (r.error) deferred.reject(r.error);
      else deferred.resolve({txId: r.result});
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }

  private getCachedAddressInfo = (address: string) => {
    let v = this.cachedAddressInfo.get(address)
    if (v) return v
    let deferred = this.$q.defer();
    deferred.promise.finally(() => {
      setTimeout(() => {
        this.cachedAddressInfo.set(address, null);
      }, 60 * 1000)
    })
    this.cachedAddressInfo.set(address, deferred.promise)
    this.getAddressInfo(address, false).then(deferred.resolve, deferred.reject)
    return this.cachedAddressInfo.get(address)
  }

  public getAddressInfoUrl(address: string): string {
    return `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}`
  }

  public getAddressInfo(address: string, useCache = false): PromiseLike<any> {
    if (useCache) {
      return this.getCachedAddressInfo(address)
    }

    let deferred = this.$q.defer<EthplorerAddressInfo>();
    let url = this.getAddressInfoUrl(address)
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
      parsed.ETH.balance = this.web3.web3.fromWei(parsed.balance, 'ether')
      wlt.saveCurrencyBalance(address, "ETH", parsed.ETH.balance)
      deferred.resolve(parsed);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }

  public getAddressTransactions(address: string, pageNum?: number): angular.IPromise<Array<EthplorerAddressTransaction>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>()
    let getTransactionsApi = `${EthBlockExplorerHeatNodeService.endPoint}/address/${address}?details=txs&page=${pageNum}&pageSize=20`
    this.http.get(getTransactionsApi).then((response) => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response
      if (parsed.transactions?.length > 0 && parsed.transactions[0]) {
        deferred.resolve(parsed.transactions)
      } else {
        deferred.resolve([])
      }
    }, (reason) => {
      deferred.reject(reason)
    })
    return deferred.promise
  }

}
