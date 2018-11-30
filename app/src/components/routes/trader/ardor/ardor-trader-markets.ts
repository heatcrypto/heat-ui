@Component({
  selector: 'ardorTraderMarkets',
  template: `
    <div class="trader-component-title" layout="row">Markets&nbsp;
      <span flex></span>
      <elipses-loading ng-show="vm.loading"></elipses-loading>
    </div>
    <input type="text" placeholder="Search markets" ng-model="vm.filter" ng-change="vm.onFilterChange()"></input>
    <md-list flex layout-fill layout="column">
      <md-list-item>
        <div class="truncate-col market-col">Market</div>
        <div class="truncate-col change-col">Change</div>
        <div class="truncate-col price-col">Price</div>
        <div class="truncate-col vol-col" flex>Vol</div>
      </md-list-item>
      <md-virtual-repeat-container flex layout-fill layout="column"
          virtual-repeat-flex-helper ng-if="vm.markets.length>0">
        <md-list-item md-virtual-repeat="item in vm.markets | filter: vm.filterFunc">
          <div class="truncate-col market-col">
            <a href="#/ardor-trader/{{item.asset}}/ardor">
              <span ng-class="{certified:item.currencyInfo.certified}">{{item.currencyInfo.symbol}}</span>/<span ng-class="{certified:item.assetInfo.certified}">{{item.assetInfo.symbol}}</span>
            </a>
          </div>
          <div class="truncate-col change-col">{{item.change}}</div>
          <div class="truncate-col price-col">{{item.price}}</div>
          <div class="truncate-col vol-col right-align" flex>{{ item.vol }}</div>
        </md-list-item>
      </md-virtual-repeat-container>
    </md-list>
  `
})

@Inject('$scope','heat','ardorAssetInfo','storage','$q','$mdToast','$interval', 'ardorBlockExplorerService')
class ArdorTraderMarketsComponent {

  // change, volume, price, none
  sort: string = 'change';
  asc: boolean = true;
  filter: string = '';
  filterFunc: Function;

  preMarkets: Array<IHeatMarket> = [null, null]; //initialized to be not equals this.markets
  markets: Array<any> = [];
  showFakeMarketsWarning = true;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfo: ArdorAssetInfoService,
              private storage: StorageService,
              private $q: angular.IQService,
              private $mdToast: angular.material.IToastService,
              private $interval: angular.IIntervalService,
              private ardorBlockExplorerService: ArdorBlockExplorerService) {
    this.filterFunc = (item) => this.filterFuncImpl(item);
    var refresh = utils.debounce(angular.bind(this, this.loadMarkets), 5*1000, false);
    heat.subscriber.trade({}, (trade)=> refresh, $scope);
    this.loadMarkets();

    let interval = $interval(()=>{
      this.loadMarkets();
    }, 20*1000, 0, false);
    $scope.$on('$destroy',()=>{$interval.cancel(interval)});
  }

  loadMarkets() {
    this.ardorBlockExplorerService.getAllAssets().then(assets => {
      this.markets = assets
      this.markets.forEach(market => {
        market.currencyInfo = {symbol: market.name, name: market.name, description: market.description}
        market.assetInfo = {symbol: 'IGNIS'}
      })
    })
  }

  isSpecialMarket(market: IHeatMarket) {
    return market.currency == '5592059897546023466' && market.asset == '0';
  }

  compareMarketAlphabetical(a: IHeatMarket, b: IHeatMarket): number {
    let currencyA = <AssetInfo>a['currencyInfo'];
    let assetA = <AssetInfo>a['assetInfo'];
    let currencyB = <AssetInfo>b['currencyInfo'];
    let assetB = <AssetInfo>b['assetInfo'];

    if (currencyA.symbol < currencyB.symbol)
      return -1;
    if (currencyA.symbol > currencyB.symbol)
      return 1;
    if (assetA.symbol < assetB.symbol)
      return -1;
    if (assetA.symbol > assetB.symbol)
      return 1;
    return 0;
  }

  public onFilterChange() {
    this.$scope.$evalAsync(() => {
      this.markets = [].concat(this.markets);
    });
  }

  // filter function used in ng-repeat
  private filterFuncImpl(market: IHeatMarket|any) {
    if (this.filter) {
      let mask = this.filter.toUpperCase();
      if (!
            (market.currencyInfo.symbol.toUpperCase().indexOf(mask) >= 0 ||
             market.assetInfo.symbol.toUpperCase().indexOf(mask) >= 0 ||
             market.currencyInfo.name.toUpperCase().indexOf(mask) >= 0 ||
            (market.currencyInfo.description !== null && market.currencyInfo.description.toUpperCase().indexOf(mask) >= 0))
         )
      {
        return false;
      }
    }
    return true;
  }
}
