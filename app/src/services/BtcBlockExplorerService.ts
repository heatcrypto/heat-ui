
@Service('btcBlockExplorerService')
@Inject('http', '$q')
class BtcBlockExplorerService {

  static endPoint: string;
  constructor(private http: HttpService,
    private $q: angular.IQService) {
    BtcBlockExplorerService.endPoint = 'http://176.9.144.171:3001/insight-api';
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<number>();
    this.getAddressInfo(address).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed.balanceSat + parsed.unconfirmedBalanceSat)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getTransactions = (address: string, from: number, to: number): angular.IPromise<any> => {
    let getTransactionsApi = `${BtcBlockExplorerService.endPoint}/addrs/${address}/txs?from=${from}&to=${to}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed.items)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let getTransactionsApi = `${BtcBlockExplorerService.endPoint}/addr/${address}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee = () => {
    let getEstimatedFeeApi = `https://bitcoinfees.earn.com/api/v1/fees/list`;
    let deferred = this.$q.defer();
    let fee = 20;
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      parsed.fees.forEach(feeObject => {
        if (feeObject.maxDelay == 1) {
          fee = feeObject.minFee
        }
      });
      if (!fee)
        fee = 20
      deferred.resolve(fee);
    }, () => {
      deferred.resolve(fee);
    })
    return deferred.promise
  }

  public getTxInfo = (txId: string) => {
    let getTxInfoApi = `${BtcBlockExplorerService.endPoint}/tx/${txId}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = utils.parseResponse(response)
      if(parsed.heatUtilParsingError)
        deferred.reject()
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }
}