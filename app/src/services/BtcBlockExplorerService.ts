
@Service('btcBlockExplorerService')
@Inject('http', '$q')
class BtcBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService) {
  }

  public getBalance(address: string) {
    let deferred = this.$q.defer<string>();
    var balancesApi = 'https://testnet.blockexplorer.com/api/addr/:address/balance';
    this.http.get(balancesApi.replace(':address', address))
        .then(response => {
          deferred.resolve(response)
        }, () => {
          deferred.reject()
        })
    return deferred.promise
  }

  public getTransactions(address: string, pageNum: number): angular.IPromise<any> {
    var getTransactionsApi = 'https://testnet.blockexplorer.com/api/txs/?address=:address&pageNum=:pageNum';
    var deferred = this.$q.defer();
    this.http.get(getTransactionsApi.replace(':address', address).replace(':pageNum', pageNum.toString())).then(response => {
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txs)
    }, ()=> {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo(address: string): angular.IPromise<BlockExplorerAddressInfo>  {
    var getTransactionsApi = 'https://testnet.blockexplorer.com/api/addr/:address?noTxList=0&noCache=1';
    var deferred = this.$q.defer<BlockExplorerAddressInfo>();
    this.http.get(getTransactionsApi.replace(':address', address)).then(response => {
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee() {
    var getEstimatedFeeApi = 'https://testnet.blockexplorer.com/api/utils/estimatefee';
    var deferred = this.$q.defer();
    this.http.get(getEstimatedFeeApi).then(response => {
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getTxInfo(txId: string) {
    var getEstimatedFeeApi = 'https://testnet.blockexplorer.com/api/tx/:txId';
    var deferred = this.$q.defer<BlockExplorerTxInfo>();
    this.http.get(getEstimatedFeeApi.replace(':txId', txId)).then(response => {
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
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