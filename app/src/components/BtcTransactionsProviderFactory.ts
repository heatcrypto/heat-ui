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
    this.btcBlockExplorerService.getAddressInfo(this.account).then(result => {
      deferred.resolve(result.final_n_tx)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    let pageNum = 0;
    pageNum = (lastIndex / 10) - 1;
    return this.btcBlockExplorerService.getTransactions(this.account, pageNum)
  }

}
