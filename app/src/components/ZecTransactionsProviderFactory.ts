@Service('zecTransactionsProviderFactory')
@Inject('http','$q', 'zecBlockExplorerService')
class ZecTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private zecBlockExplorerService: ZecBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider{
    return new ZecTransactionsProvider(this.http, this.$q, this.zecBlockExplorerService, account);
  }
}

class ZecTransactionsProvider implements IPaginatedDataProvider {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private zecBlockExplorerService: ZecBlockExplorerService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.zecBlockExplorerService.getTransactionCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })
    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    let pageNum = 0;
    pageNum = (lastIndex / 10) - 1;
    return this.zecBlockExplorerService.getTransactions(this.account, pageNum)
  }

}
