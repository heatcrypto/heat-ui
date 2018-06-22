@Service('btcTransactionsProviderFactory')
@Inject('http','$q', 'btcBlockExplorerService')
class BtcTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private btcBlockExplorerService: BtcBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new BtcTransactionsProvider(this.http, this.$q, this.btcBlockExplorerService, account);
  }
}

class BtcTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private btcBlockExplorerService: BtcBlockExplorerService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
      deferred.resolve(10);
      return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    return this.btcBlockExplorerService.getTransactions('my5Kt1UfJ6oKuaA9vtqpJUeDSEo6AcDHh4')
  }

}
