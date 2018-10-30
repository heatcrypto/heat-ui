@Service('nextTransactionsProviderFactory')
@Inject('http','$q', 'nextBlockExplorerService')
class NextTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private nextBlockExplorerService: NextBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new NextTransactionsProvider(this.http, this.$q, this.nextBlockExplorerService, account);
  }
}

class NextTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private nextBlockExplorerService: NextBlockExplorerService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.nextBlockExplorerService.getTransactionsCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    return this.nextBlockExplorerService.getTransactions(this.account, firstIndex, lastIndex)
  }

}
