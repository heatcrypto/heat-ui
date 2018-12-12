// @Service('nemTransactionsProviderFactory')
// @Inject('http','$q', 'nemBlockExplorerService')
// class NemTransactionsProviderFactory  {
//   constructor(private http: HttpService,
//               private $q: angular.IQService,
//               private nemBlockExplorerService: NemBlockExplorerService) {}

//   public createProvider(account: string): IPaginatedDataProvider {
//     return new NemTransactionsProvider(this.http, this.$q, this.nemBlockExplorerService, account);
//   }
// }

// class NemTransactionsProvider implements IPaginatedDataProvider {

//   constructor(private http: HttpService,
//               private $q: angular.IQService,
//               private nemBlockExplorerService: NemBlockExplorerService,
//               private account: string) {}

//   /* Be notified this provider got destroyed */
//   public destroy() {}

//   /* The number of items available */
//   public getPaginatedLength(): angular.IPromise<number> {
//     let deferred = this.$q.defer<number>()
//     this.nemBlockExplorerService.getTransactionsCount(this.account).then(result => {
//       deferred.resolve(result)
//     }, () => {
//       deferred.reject()
//     })

//     return <angular.IPromise<number>>deferred.promise;
//   }

//   /* Returns results starting at firstIndex and up to and including lastIndex */
//   public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
//     // return this.nemBlockExplorerService.getTransactions(this.account, firstIndex, lastIndex)
//     return null
//   }

// }
