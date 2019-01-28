@Service('ardorTransactionsProviderFactory')
@Inject('http','$q', 'ardorBlockExplorerService')
class ArdorTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private ardorBlockExplorerService: ArdorBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new ArdorTransactionsProvider(this.http, this.$q, this.ardorBlockExplorerService, account);
  }
}

class ArdorTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private ardorBlockExplorerService: ArdorBlockExplorerService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.ardorBlockExplorerService.getTransactionsCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    return this.ardorBlockExplorerService.getTransactions(this.account, firstIndex, lastIndex)
  }

}
