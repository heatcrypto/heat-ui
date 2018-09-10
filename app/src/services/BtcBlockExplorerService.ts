
@Service('btcBlockExplorerService')
@Inject('http', '$q')
class BtcBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService) {
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    if (!address)
      deferred.reject()
    else {
      let balancesApi = `https://blockexplorer.com/api/addr/${address}/balance`;
      this.http.get(balancesApi)
        .then(response => {
          deferred.resolve(response)
        }, () => {
          deferred.reject()
        }
      )
    }
    return deferred.promise
  }

  public getTransactions(address: string, pageNum: number): angular.IPromise<any> {
    let getTransactionsApi = `https://blockexplorer.com/api/txs/?address=${address}&pageNum=${pageNum}`;
    let deferred = this.$q.defer();
    if (!address)
      deferred.reject()
    else {
      this.http.get(getTransactionsApi).then(response => {
        let parsed = angular.isString(response) ? JSON.parse(response) : response;
        deferred.resolve(parsed.txs)
      }, ()=> {
        deferred.reject();
      })
    }
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<BlockExplorerAddressInfo>  {
    let getTransactionsApi = `https://blockexplorer.com/api/addr/${address}?noTxList=0&noCache=1`;
    let deferred = this.$q.defer<BlockExplorerAddressInfo>();
    if (!address)
      deferred.reject()
    else {
      this.http.get(getTransactionsApi).then(response => {
        let parsed = angular.isString(response) ? JSON.parse(response) : response;
        deferred.resolve(parsed);
      }, () => {
        deferred.reject();
      })
    }
    return deferred.promise
  }

  public getEstimatedFee() {
    let getEstimatedFeeApi = `https://blockexplorer.com/api/utils/estimatefee?nbBlocks=5`;
    let deferred = this.$q.defer();
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      let fee;
      Object.keys(parsed).forEach(function(key){
        fee = parsed[key];
      })
      deferred.resolve(fee);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    let getEstimatedFeeApi = `https://blockexplorer.com/api/tx/${txId}`;
    let deferred = this.$q.defer<BlockExplorerTxInfo>();
    if (!txId)
      deferred.reject()
    else {
      this.http.get(getEstimatedFeeApi).then(response => {
        let parsed = angular.isString(response) ? JSON.parse(response) : response;
        deferred.resolve(parsed);
      }, () => {
        deferred.reject();
      })
    }
    return deferred.promise
  }
}

interface BlockExplorerAddressInfo {
  address: string;
  txApperances: number;
  balance: number;
  transactions: Array<string>
}

interface BlockExplorerTxInfo {
  txid: string,
  blockheight: number,
  confirmations: number,
  time: number
}