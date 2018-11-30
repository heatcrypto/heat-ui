@Service('ardorTradesProviderFactory')
@Inject('ardorBlockExplorerService','$q')
class ArdorTradesProviderFactory  {
  constructor(private ardorBlockExplorerService: ArdorBlockExplorerService, private $q: angular.IQService) {}

  public createProvider(currency: string, asset: string, account?: string): IPaginatedDataProvider {
    return new ArdorTradesProvider(currency, asset, account, this.ardorBlockExplorerService, this.$q);
  }
}

class ArdorTradesProvider implements IPaginatedDataProvider {

  constructor(private currency: string,
              private asset: string,
              private account: string,
              private ardorBlockExplorerService: ArdorBlockExplorerService,
              private $q: angular.IQService) {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    if (this.account)
      return this.ardorBlockExplorerService.getTradesCount(this.currency, this.account);
    return this.ardorBlockExplorerService.getTradesCount(this.currency);
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatTrade>> {
    if (this.account)
      return this.ardorBlockExplorerService.getTrades(this.currency, firstIndex, lastIndex, this.account);
    return this.ardorBlockExplorerService.getTrades(this.currency, firstIndex, lastIndex);
  }
}