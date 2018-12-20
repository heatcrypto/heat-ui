
@Service('btcBlockExplorerService')
@Inject('http', '$q')
class BtcBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService) {
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    let balancesApi = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance?token=d7995959366d4369976aabb3355c7216`;
    this.http.get(balancesApi)
        .then(response => {
          let parsed = angular.isString(response) ? JSON.parse(response) : response;
          deferred.resolve(parsed.final_balance)
        }, () => {
          deferred.reject()
        })
    return deferred.promise
  }

  public getTransactions(address: string, pageNum: number): angular.IPromise<any> {
    let getTransactionsApi = `https://blockexplorer.com/api/txs/?address=${address}&pageNum=${pageNum}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txs)
    }, ()=> {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<any>  {
    let getTransactionsApi = `https://api.blockcypher.com/v1/btc/main/addrs/${address}?token=d7995959366d4369976aabb3355c7216`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee() {
    let getEstimatedFeeApi = `https://bitcoinfees.earn.com/api/v1/fees/list`;
    let deferred = this.$q.defer();
    let fee = 20;
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      parsed.fees.forEach(feeObject => {
        if(feeObject.maxDelay == 1) {
          fee = feeObject.minFee
        }
      });
      deferred.resolve(fee);
    }, () => {
      deferred.resolve(fee);
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getTxInfoApi = `https://api.blockcypher.com/v1/btc/main/txs/${txId}?token=d7995959366d4369976aabb3355c7216`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }
}