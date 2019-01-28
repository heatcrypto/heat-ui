@Service('ardorOrdersProviderFactory')
@Inject('ardorBlockExplorerService', '$q')
class ArdorOrdersProviderFactory {
  constructor(private ardorBlockExplorerService: ArdorBlockExplorerService, private $q: angular.IQService) { }

  public createProvider(currency: string, asset: string, account?: string, isAsk?: boolean): IPaginatedDataProvider {
    return new ArdorOrdersProvider(currency, asset, account, isAsk, this.ardorBlockExplorerService, this.$q);
  }
}

class ArdorOrdersProvider implements IPaginatedDataProvider {
  constructor(private currency: string,
    private asset: string,
    private account: string,
    private isAsk: boolean,
    private ardorBlockExplorerService: ArdorBlockExplorerService,
    private $q: angular.IQService) { }

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    if (this.account) {
      return this.ardorBlockExplorerService.getMyPendingOrdersCount(this.account, this.currency)
    } else if (this.isAsk) {
      return this.ardorBlockExplorerService.getAskOrdersCount(this.currency)
    }
    return this.ardorBlockExplorerService.getBidOrdersCount(this.currency)
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatOrder>> {
    if (this.account) {
      return this.ardorBlockExplorerService.getMyPendingOrders(this.account, this.currency, firstIndex, lastIndex)
    } else if (this.isAsk) {
      return this.ardorBlockExplorerService.getAskOrders(this.currency, firstIndex, lastIndex)
    }
    return this.ardorBlockExplorerService.getBidOrders(this.currency, firstIndex, lastIndex)
  }
}



