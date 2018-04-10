@Service('etherscanTransactionsProviderFactory')
@Inject('$q', 'etherscanService', 'lightwalletService')
class EtherscanTransactionsProviderFactory  {
  constructor(private $q: angular.IQService,
              private etherscanService: EtherscanService,
              private lightwalletService: LightwalletService) {}

  public createProvider(): IPaginatedDataProvider {
    return new EtherscanTransactionsProvider(this.$q, this.etherscanService, this.lightwalletService);
  }
}

class EtherscanTransactionsProvider implements IPaginatedDataProvider {
  constructor(private $q: angular.IQService,
              private etherscanService: EtherscanService,
              private lightwalletService: LightwalletService) {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    deferred.resolve(20);
    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<any>> {
    var walletAddress = this.lightwalletService.walletAddress;
    return this.etherscanService.getEtherTransactions(walletAddress, firstIndex, lastIndex);
  }
}