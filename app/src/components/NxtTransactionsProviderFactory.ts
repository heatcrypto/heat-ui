@Service('nxtTransactionsProviderFactory')
@Inject('http','$q', 'nxtBlockExplorerService')
class NxtTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private nxtBlockExplorerService: NxtBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new NxtTransactionsProvider(this.http, this.$q, this.nxtBlockExplorerService, account);
  }
}

class NxtTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private nxtBlockExplorerService: NxtBlockExplorerService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.nxtBlockExplorerService.getTransactionsCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    return this.nxtBlockExplorerService.getTransactions(this.account, firstIndex, lastIndex)
  }

}
