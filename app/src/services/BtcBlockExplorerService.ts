
@Service('btcBlockExplorerService')
@Inject('http', '$q')
class BtcBlockExplorerService {

  constructor(private http: HttpService,
              private $q: angular.IQService) {
  }

  public getBalances(address: string) {
    let deferred = this.$q.defer<string>();
    var balancesApi = 'https://testnet.blockexplorer.com/api/addr/:address/balance';
    this.http.get(balancesApi.replace(':address', address))
        .then(response => {
          console.log("balances response " + response)
          deferred.resolve(response)
        }, () => {
          console.log(`HTTP reject for ${balancesApi}`)
          deferred.reject()
        })
    return deferred.promise
  }

  public getTransactions(address: string) {
    var getTransactionsApi = 'https://testnet.blockexplorer.com/api/txs/?address=:address';
    var deferred = this.$q.defer();
    this.http.get(getTransactionsApi.replace(':address', address)).then(response => {
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      console.log("transactions response " + response)
    })
  }
}