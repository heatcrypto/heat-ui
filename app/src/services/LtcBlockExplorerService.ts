
@Service('ltcBlockExplorerService')
@Inject('http', '$q', '$http')
class LtcBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $http: angular.IHttpService) {
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    let balancesApi = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance?token=d9a8ee8755a5481fa5b595d401e6fc65`;
    this.http.get(balancesApi)
      .then(response => {
        let parsed = angular.isString(response) ? JSON.parse(response) : response;
        deferred.resolve(parsed.final_balance)
      }, () => {
        deferred.reject()
      })
    return deferred.promise
  }

  public getTransactions(address: string, blockNum: string): angular.IPromise<any> {
    let getTransactionsApi = blockNum ? `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?before=${blockNum}&limit=10&confirmations=0` : `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=10&confirmations=0`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txs)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<any> {
    let getTransactionsApi = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}?token=d9a8ee8755a5481fa5b595d401e6fc65`;
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
    let getTxInfoApi = `https://api.blockcypher.com/v1/ltc/main/txs/${txId}?token=d9a8ee8755a5481fa5b595d401e6fc65`;
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
    let getTxInfoApi = `https://api.blockcypher.com/v1/ltc/main/addrs/${account}/full?unspent=true`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let unspent = [];
      parsed.txs.forEach(tx => {
        tx.outputs.forEach((output, i) => {
          output.addresses.forEach(address => {
            if (address == account) {
              unspent.push({ txid: tx.hash, vout: i, satoshis: output.value, scriptPubKey: output.script })
            }
          });
        });

      });
      deferred.resolve(unspent);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public newTransaction(txObject) {
    let sendTxApi = `https://api.blockcypher.com/v1/ltc/main/txs/new`;
    let deferred = this.$q.defer<any>();
    this.$http.post(sendTxApi, txObject).then((response) => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.data);
    }, (error) =>  {
      deferred.reject(error)
    })
    return deferred.promise
  }

  public broadcast(txObject) {
    let sendTxApi = `https://api.blockcypher.com/v1/ltc/main/txs/push?token=d9a8ee8755a5481fa5b595d401e6fc65`;
    let deferred = this.$q.defer<any>();
    this.$http.post(sendTxApi, {tx: txObject.signatures[0]}).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.data);
    }, (error) => {
      deferred.reject(error);
    })
    return deferred.promise
  }
}