@Service('fimkTransactionsProviderFactory')
@Inject('http','$q', 'mofoSocketService')
class FimkTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private mofoSocketService: MofoSocketService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new FimkTransactionsProvider(this.http, this.$q, this.mofoSocketService, account);
  }
}

class FimkTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private mofoSocketService: MofoSocketService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.mofoSocketService.getTransactionsCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    let pageNum = 0;
    pageNum = (lastIndex / 15) - 1;
    return this.mofoSocketService.getTransactions(this.account, pageNum)
  }

}
