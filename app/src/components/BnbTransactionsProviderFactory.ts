@Service('bnbTransactionsProviderFactory')
@Inject('http','$q', 'bnbBlockExplorerService')
class BnbTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private bnbBlockExplorerService: BnbBlockExplorerService) {}

  public createProvider(account: string): IPaginatedDataProvider{
    return new BnbTransactionsProvider(this.http, this.$q, this.bnbBlockExplorerService, account);
  }
}

class BnbTransactionsProvider implements IPaginatedDataProvider {
  protected currentDate;
  protected MONTH_NUMBER = 3;
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private bnbBlockExplorerService: BnbBlockExplorerService,
              private account: string) {
                this.currentDate = new Date();
              }

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.bnbBlockExplorerService.getTransactionCount(this.account).then(result => {
      deferred.resolve(result)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    let endTime = this.currentDate.getTime();
    let startTime = new Date(new Date().setMonth(this.currentDate.getMonth() - this.MONTH_NUMBER)).getTime();
    let limit = lastIndex - firstIndex;
    let offset = firstIndex;
    return this.bnbBlockExplorerService.getTransactions(this.account, startTime, endTime, limit, offset)
  }

}
