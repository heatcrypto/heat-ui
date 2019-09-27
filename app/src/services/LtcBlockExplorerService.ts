
@Service('ltcBlockExplorerService')
@Inject('http', '$q', '$http')
class LtcBlockExplorerService {
  static endPoint: string;

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $http: angular.IHttpService) {
    LtcBlockExplorerService.endPoint = 'https://ltc1.heatwallet.com/api/v2';
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    this.getAddressInfo(address).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.balance)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
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

  public getAddressInfo(address: string): angular.IPromise<any> {
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
