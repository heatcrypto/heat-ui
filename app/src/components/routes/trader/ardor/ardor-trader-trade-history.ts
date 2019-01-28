///<reference path='../../../VirtualRepeatComponent.ts'/>
@Component({
  selector: 'ardorTraderTradeHistory',
  inputs: ['currencyInfo','assetInfo','oneClickOrders'],
  template: `
  <script type="text/ng-template" id="popoverHistory.html">
    <div class="account-popover">
      <div>Buyer: {{item.buyerName||item.buyer}}</div>
      <div>Seller: {{item.sellerName||item.seller}}</div>
    </div>
  </script>
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Past trades&nbsp;
        <span flex></span>
        <span layout="row" ng-if="vm.user.unlocked" class="selector">
          <label>
            <input type="radio" name="trader-show-trades" value="all" ng-model="vm.showTheseTrades" ng-change="vm.updateView()">
            <i>Show all trades</i>
          </label>
          <label>
            <input type="radio" name="trader-show-trades" value="my" ng-model="vm.showTheseTrades" ng-change="vm.updateView()">
            <i>Show my trades</i>
          </label>
        </span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item class="header">
          <div class="truncate-col info-col"></div>
          <div class="truncate-col type-col">Type</div>
          <div class="truncate-col time-col" flex>Time</div>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col quantity-col">{{vm.assetInfo.symbol}}</div>
          <div class="truncate-col total-col" flex>Total ({{vm.currencyInfo.symbol}})</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" ng-class="{'virtual': item.virtual}">
            <div class="truncate-col info-col">
              <div
                class="info"
                angular-popover
                direction="right"
                template-url="popoverHistory.html"
                mode="mouseover"
                style="position: absolute;">
              </div>
              <img src="assets/info.png">
            </div>
            <div class="truncate-col type-col">{{item.type}}</div>
            <div class="truncate-col time-col" flex>{{item.time}}</div>
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col total-col" flex>{{item.total}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope', '$window', 'ardorTradesProviderFactory','$q','user','settings')
class ArdorTraderTradeHistoryComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  oneClickOrders: boolean; // @input

  showTheseTrades: string = "all";

  constructor(protected $scope: angular.IScope,
              private $window: ng.IWindowService,
              private tradesProviderFactory: ArdorTradesProviderFactory,
              $q: angular.IQService,
              private user: UserService,
              private settings: SettingsService)
  {
    super($scope, $q);

    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.createProvider();
        unregister.forEach(fn => fn());
        angular.element($window).bind('resize', () => this.onResize());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  createProvider() {
    let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    if (this.$window.innerWidth < 870) {
      format = this.settings.get(SettingsService.TIMEFORMAT_DEFAULT);
    }
    var account = this.showTheseTrades == 'all' ? null : this.user.account;
    this.initializeVirtualRepeat(
      this.tradesProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, account),

      /* decorator function */
      (trade: IHeatTrade|any) => {
        var date = utils.ardorTimestampToDate(trade.timestamp);
        trade.time = dateFormat(date, format);
        if (account) {
          trade.type = trade.seller == account ? 'Sell' : 'Buy'
        }
        else {
          trade.type = trade.isBuy ? 'Buy' : 'Sell';
        }
        trade.price = trade.priceNQTPerShare
        trade.quantity = trade.quantityQNT
        trade.priceDisplay = utils.formatQNT(trade.price, this.assetInfo.decimals);
        trade.quantityDisplay = utils.formatQNT(trade.quantity, this.currencyInfo.decimals);
        var totalQNT = utils.calculateTotalOrderPriceQNT(trade.quantity, trade.price);
        trade.total = utils.formatQNT(totalQNT,this.currencyInfo.decimals);
        trade.virtual = trade.block == "0";
      }
    );
  }

  onSelect(item) {}

  updateView() {
    if (this.currencyInfo && this.assetInfo) {
      this.createProvider();
    }
  }
  onResize() {
    this.updateView()
  }
}
