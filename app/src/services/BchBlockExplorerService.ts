
@Service('bchBlockExplorerService')
@Inject('http', '$q')
class BchBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService) {
  }

  public getBalance(address: string): angular.IPromise<string> {
    let deferred = this.$q.defer<string>();
    let balancesApi = `https://chain.api.btc.com/v3/address/${address}`;
    this.http.get(balancesApi)
        .then(response => {
          let parsed = angular.isString(response) ? JSON.parse(response) : response;
          let balance = parsed.data ? parsed.data.balance : 0
          deferred.resolve(balance)
        }, () => {
          deferred.reject()
        })
    return deferred.promise
  }

  public getTransactions(address: string, pageNum: number): angular.IPromise<any> {
    let getTransactionsApi = `https://chain.api.btc.com/v3/address/${address}/tx?page=${pageNum}&pagesize=50`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let txs = parsed.data ? parsed.data.list : [];
      deferred.resolve(txs)
    }, ()=> {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<any> {
    let getTransactionsApi = `https://chain.api.btc.com/v3/address/${address}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let txCount = parsed.data ? parsed.data.tx_count : 0;
      deferred.resolve(txCount)
    }, ()=> {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getEstimatedFee() {
    let getEstimatedFeeApi = `https://bitcoinfees.earn.com/api/v1/fees/list`;
    let deferred = this.$q.defer();
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let fee;
      parsed.fees.forEach(feeObject => {
        if(feeObject.maxDelay == 1) {
          fee = feeObject.minFee
        }
      });
     if(!fee)
      fee = 20

      deferred.resolve(fee);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getTxInfoApi = `https://chain.api.btc.com/v3/tx/${txId}?verbose=3`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let tx = parsed.data ? parsed.data : {}
      deferred.resolve(tx);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }
}