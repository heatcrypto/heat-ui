
@Service('bchBlockExplorerService')
@Inject('http', '$q')
class BchBlockExplorerService {
  static endPoint: string;

  constructor(private http: HttpService,
              private $q: angular.IQService) {
    BchBlockExplorerService.endPoint = 'https://bch1.heatwallet.com/api/v2';
  }

  private attachPrefixToAddresses(address: string) {
    return (address && address.startsWith('q')) ? `bitcoincash:${address}` : address;
  }

  public getBalance(address: string): angular.IPromise<string> {
    let formattedAddress = this.attachPrefixToAddresses(address)
    let deferred = this.$q.defer<string>();
    this.getAddressInfo(formattedAddress).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.balance)
    }, () => {
      deferred.resolve("0")
    })
    return deferred.promise
  }

  public getTransactions(address: string, pageNum: number, pageSize: number): angular.IPromise<any> {
    let formattedAddress = this.attachPrefixToAddresses(address)
    let getTransactionsApi = `${BchBlockExplorerService.endPoint}/address/${formattedAddress}?details=txs&page=${pageNum}&pageSize=${pageSize}`;
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
    let formattedAddress = this.attachPrefixToAddresses(address)
    let getTransactionsApi = `${BchBlockExplorerService.endPoint}/address/${formattedAddress}?details=basic`;
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
    let formattedAddress = this.attachPrefixToAddresses(account)
    let getTxInfoApi = `${BchBlockExplorerService.endPoint}/utxo/${formattedAddress}`;
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
