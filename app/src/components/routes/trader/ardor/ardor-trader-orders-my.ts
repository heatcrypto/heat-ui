///<reference path='../../../VirtualRepeatComponent.ts'/>
@Component({
  selector: 'ardorTraderOrdersMy',
  inputs: ['currencyInfo','assetInfo','oneClickOrders'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">{{vm.user.unlocked?'My':'All'}} pending orders&nbsp;
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item class="header">
          <div class="truncate-col type-col">Type</div>
          <div class="truncate-col market-col">Market</div>
          <div class="truncate-col quantity-col">Quantity</div>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col total-col">Total ({{vm.currencyInfo.symbol}})</div>
          <div class="truncate-col expires-col" flex>Expires</div>
          <div class="truncate-col cancel-col" layout="row" layout-align="end" ng-if="vm.user.unlocked"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry"
              ng-class="{'virtual': item.unconfirmed, 'currentlyNotValid': item.currentlyNotValid||item.cancelled}">
            <div class="truncate-col type-col">{{item.typeDisplay}}</div>
            <div class="truncate-col market-col">{{item.market}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col total-col">{{item.total}}</div>
            <div class="truncate-col expires-col" flex tooltip="{{item.expires}}">{{item.expires}}</div>
            <div class="truncate-col cancel-col" layout="row" layout-align="end" ng-if="vm.user.unlocked">
              <a ng-if="!item.cancelled && !item.unconfirmed" ng-click="vm.cancelOrder(item)">Cancel</a>
            </div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','ardorOrdersProviderFactory','$q','user','settings','cancelBidOrder','cancelAskOrder')
class ArdorTraderOrdersMyComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  oneClickOrders: boolean; // @input

  refreshGrid: ()=>void;

  constructor(protected $scope: angular.IScope,
              private ordersProviderFactory: ArdorOrdersProviderFactory,
              $q: angular.IQService,
              public user: UserService,
              settings: SettingsService,
              private cancelBidOrder: CancelBidOrderService,
              private cancelAskOrder: CancelAskOrderService,)
  {
    super($scope, $q);

    var format = settings.get(SettingsService.DATEFORMAT_DEFAULT);
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {

        /* initialize virtual repeat component */
        this.initializeVirtualRepeat(
          this.ordersProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, user.account),

          /* decorator function */
          (order: any|IHeatOrder) => {
            order.price = order.priceNQTPerShare
            order.quantity = order.quantityQNT
            order.typeDisplay = order.type == 'ask' ? 'Sell' : 'Buy';
            order.market = this.currencyInfo.symbol + '/' + this.assetInfo.symbol;
            order.quantityDisplay = utils.formatQNT(order.quantity, this.assetInfo.decimals);
            order.priceDisplay = utils.formatQNT(order.price, this.currencyInfo.decimals);
            var totalQNT = utils.calculateTotalOrderPriceQNT(order.quantity, order.price);
            order.total = utils.formatQNT(totalQNT,this.currencyInfo.decimals);
            var date = utils.timestampToDate(order.expiration);
            order.expires = dateFormat(date, format);
          }
        );

        /* stop watching the currenyInfo and assetInfo */
        unregister.forEach(fn => fn());

      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    this.refreshGrid = utils.debounce(angular.bind(this, this.determineLength), 1000, false);
  }

  onSelect(item) {}

  cancelOrder(order: IHeatOrder) {
    var dialog = order.type == 'ask' ?
      this.cancelAskOrder.dialog(order.order):
      this.cancelBidOrder.dialog(order.order);
    if (this.oneClickOrders)
      dialog.send()
    else
      dialog.show()
  }
}
