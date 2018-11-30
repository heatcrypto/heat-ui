///<reference path='../../../VirtualRepeatComponent.ts'/>
@Component({
  selector: 'ardorTraderOrdersSell',
  inputs: ['currencyInfo', 'assetInfo', 'selectedOrder'],
  template: `
    <script type="text/ng-template" id="templateId.tml">
      <div class="account-popover">
        {{item.account||item.accountName}}
      </div>
    </script>
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">{{vm.assetInfo.symbol}} Sellers&nbsp;
        <span flex></span>
        <span class="balance clickable-text" ng-click="vm.broadcast()" ng-if="vm.user.unlocked">BALANCE: {{vm.assetBalance}}&nbsp;{{vm.assetInfo.symbol}}</span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item  class="header">
          <div class="truncate-col info-col"></div>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col quantity-col">Quantity</div>
          <div class="truncate-col total-col">Total</div>
          <div class="truncate-col sum-col">Sum ({{vm.currencyInfo.symbol}})</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper class="content">
          <md-list-item md-virtual-repeat="item in vm" md-on-demand
               ng-click="vm.select(item)" aria-label="Entry"
               ng-class="{'virtual': item.unconfirmed, 'currentlyNotValid': item.currentlyNotValid||item.cancelled}">
           <div class="truncate-col info-col">
             <div
              class="info"
              angular-popover
              direction="right"
              template-url="templateId.tml"
              mode="mouseover"
              style="position: absolute;">
             </div>
             <img src="assets/info.png">
           </div>
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col total-col">{{item.total}}</div>
            <div class="truncate-col sum-col">{{item.sum}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope', '$rootScope', 'ardorOrdersProviderFactory', '$q', 'user', 'ardorBlockExplorerService')
class ArdorTraderOrdersSellComponent extends VirtualRepeatComponent {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input

  assetBalance: string = "*"; // formatted asset balance

  PAGE_SIZE = 100; /* VirtualRepeatComponent */

  private orders: Array<IHeatOrder> = [];

  refreshGrid: () => void;
  refreshBalance: () => void;

  constructor(protected $scope: angular.IScope,
    private $rootScope: angular.IScope,
    private ordersProviderFactory: ArdorOrdersProviderFactory,
    $q: angular.IQService,
    private user: UserService,
    private ardorBlockExplorerService: ArdorBlockExplorerService) {
    super($scope, $q);

    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        let sum = 0;
        /* initialize virtual repeat component */
        this.initializeVirtualRepeat(
          this.ordersProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, null, true),

          /* decorator */
          (order: IHeatOrder | any, context: any) => {
            order.price = order.priceNQTPerShare
            order.quantity = order.quantityQNT
            order.unconfirmedQuantity = order.quantity
            order.priceDisplay = utils.formatQNT(order.price, this.assetInfo.decimals);
            order.quantityDisplay = utils.formatQNT(order.unconfirmedQuantity, this.currencyInfo.decimals);
            var totalQNT = utils.calculateTotalOrderPriceQNT(order.unconfirmedQuantity, order.price);
            order.total = utils.formatQNT(totalQNT, this.currencyInfo.decimals);
            sum +=  parseFloat(totalQNT)
            order.sum = utils.formatQNT(sum.toString(), this.currencyInfo.decimals);
            this.orders.push(order);
          });
        unregister.forEach(fn => fn());
        if (this.user.unlocked) {
          this.updateAssetBalance();
        }
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready), $scope.$watch('vm.assetInfo', ready)];

    this.refreshGrid = utils.debounce(angular.bind(this, this.determineLength), 2000, false);
    this.refreshBalance = utils.debounce(angular.bind(this, this.updateAssetBalance), 2000, false);

    $scope.$on('total', (event, opts) => {
      let price = parseInt(this.orders[0].price);
      let totalQuantity = 0;
      let total = parseFloat(opts.total);
      for (let i = 0; i < this.orders.length; i++) {
        totalQuantity += (parseFloat(this.orders[i].quantity) / 100000000);
        if (totalQuantity >= total) {
          price = parseInt(this.orders[i].price);
          break;
        }
      }
      price = price / 100000000;
      let balance = total / price;
      this.$rootScope.$broadcast('price', { price, balance, total })
    });
  }

  private broadcast() {
    this.$rootScope.$broadcast('balance', { balance: this.assetBalance })
  }

  onSelect(selectedOrder) {
    this.selectedOrder = selectedOrder;
  }

  updateAssetBalance() {
    this.ardorBlockExplorerService.getBalance(this.user.account, 2).then(balance => {
      this.assetBalance = utils.formatQNT(balance, this.assetInfo.decimals);
    }), () => {
      this.assetBalance = "0";
    }
  }
}
