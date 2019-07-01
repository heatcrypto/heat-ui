@Service('iotaTransactionsProviderFactory')
@Inject('http','$q', 'iotaBlockExplorerService')
class IotaTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private iotaBlockExplorerService: IotaBlockExplorerService) {}

  public createProvider(seed: string): IPaginatedDataProvider {
    return new iotaTransactionsProvider(this.http, this.$q, this.iotaBlockExplorerService, seed);
  }
}

class iotaTransactionsProvider implements IPaginatedDataProvider {

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private iotaBlockExplorerService: IotaBlockExplorerService,
              private seed: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.iotaBlockExplorerService.getAccountInfo(this.seed).then(result => {
      deferred.resolve(result.transfers.length)
    }, () => {
      deferred.reject()
    })

    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): any {
    return new Promise((resolve, reject) => {
      this.iotaBlockExplorerService.getAccountInfo(this.seed).then(result => resolve(result.transfers))
    })
  }

}
