
@Service('ltcBlockExplorerService')
@Inject('http', '$q', '$http', 'settings')
class LtcBlockExplorerService {
  static endPoint: string;
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();
  private cachedAddressInfo: Map<string, any> = new Map<string, any>();

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $http: angular.IHttpService,
              private settingsService: SettingsService) {
    this.settingsService.initialized.then(
      () => LtcBlockExplorerService.endPoint = SettingsService.getCryptoServerEndpoint('LTC')
    );

  }

  public isSyncing() {
    let deferred = this.$q.defer();
    this.http.get(LtcBlockExplorerService.endPoint).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      if(parsed && parsed.blockbook && parsed.blockbook.inSync && parsed.blockbook.coin === 'Litecoin')
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
    let getTransactionsApi = `${LtcBlockExplorerService.endPoint}/address/${address}?details=txs&page=${pageNum}&pageSize=${pageSize}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.transactions)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
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

  public getAddressInfo(address: string, useCache = false): angular.IPromise<any> {
    if (useCache) {
      return this.getCachedAddressInfo(address)
    }

    let getTransactionsApi = `${LtcBlockExplorerService.endPoint}/address/${address}?details=basic`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee(): angular.IPromise<number>{
    let getEstimatedFeeApi = `https://api.blockcypher.com/v1/ltc/main`;
    let deferred = this.$q.defer<number>();
    let fee = 10;
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      fee = parsed.medium_fee_per_kb ? parseFloat(parsed.medium_fee_per_kb) : 10000
      deferred.resolve(fee);
    }, () => {
      deferred.resolve(fee);
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getTxInfoApi = `${LtcBlockExplorerService.endPoint}/tx/${txId}`;
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
    let getTxInfoApi = `${LtcBlockExplorerService.endPoint}/utxo/${account}`;
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
    let sendTxApi = `${LtcBlockExplorerService.endPoint}/sendtx/${txObject}`;
    let deferred = this.$q.defer<any>();
    this.$http.get(sendTxApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.data);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }
}
