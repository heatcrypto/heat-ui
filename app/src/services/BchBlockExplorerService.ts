
@Service('bchBlockExplorerService')
@Inject('http', '$q', 'settings')
class BchBlockExplorerService {
  static endPoint: string;
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private settingsService: SettingsService) {
    this.settingsService.initialized.then(
      () => BchBlockExplorerService.endPoint = SettingsService.getCryptoServerEndpoint('BCH')
    );
  }

  public isSyncing() {
    let deferred = this.$q.defer();
    this.http.get(BchBlockExplorerService.endPoint).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if(parsed && parsed.blockbook && parsed.blockbook.inSync && parsed.blockbook.coin === 'Bcash')
        deferred.resolve()
      else
        deferred.reject()
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
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
    if (this.cachedGetCachedAccountBalance.get(address))
      return this.cachedGetCachedAccountBalance.get(address)
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

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<string>();
    this.getCachedAccountBalance(address).then(info => {
      deferred.resolve(info)
    })
    return deferred.promise;
  }

  public getTransactions(address: string, pageNum: number, pageSize: number): angular.IPromise<any> {
    let getTransactionsApi = `${BchBlockExplorerService.endPoint}/address/${address}?details=txs&page=${pageNum}&pageSize=${pageSize}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.transactions)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<any> {
    let getTransactionsApi = `${BchBlockExplorerService.endPoint}/address/${address}?details=basic`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getEstimatedFee() {
    let getEstimatedFeeApi = `${BchBlockExplorerService.endPoint}/estimatefee/1`;
    let deferred = this.$q.defer();
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.result);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getTxInfoApi = `${BchBlockExplorerService.endPoint}/tx/${txId}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getUnspentUtxos(account: string) {
    let getTxInfoApi = `${BchBlockExplorerService.endPoint}/utxo/${account}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public broadcast(rawTx) {
    let sendTxApi = `${BchBlockExplorerService.endPoint}/sendtx/${rawTx}`;
    let deferred = this.$q.defer<any>();
    this.http.get(sendTxApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }
}
