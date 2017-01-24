///<reference path='../../VirtualRepeatComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
@Component({
  selector: 'traderOrdersMy',
  inputs: ['currencyInfo','assetInfo','oneClickOrders'],
  styles: [`
    trader-orders-my .type-col {
      width: 45px;
    }
    trader-orders-my .market-col {
      width: 120px;
    }
    trader-orders-my .quantity-col, trader-orders-my .price-col, trader-orders-my .total-col {
      width: 100px;
    }
    trader-orders-my .expires-col {}
    trader-orders-my .cancel-col {
      width: 60px;
    }
    trader-orders-my .cancel-col a {
      text-decoration: underline;
      cursor:pointer;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">{{vm.user.unlocked?'My':'All'}} pending orders&nbsp;
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item>
          <div class="truncate-col type-col">Type</div>
          <div class="truncate-col market-col">Market</div>
          <div class="truncate-col quantity-col">Quantity</div>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col total-col">Total ({{vm.currencyInfo.symbol}})</div>
          <div class="truncate-col expires-col" flex>Expires</div>
          <div class="truncate-col cancel-col" layout="row" layout-align="end" ng-if="vm.user.unlocked"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col type-col">{{item.typeDisplay}}</div>
            <div class="truncate-col market-col">{{item.market}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col total-col">{{item.total}}</div>
            <div class="truncate-col expires-col" flex tooltip="{{item.expires}}">{{item.expires}}</div>
            <div class="truncate-col cancel-col" layout="row" layout-align="end" ng-if="vm.user.unlocked"><a ng-click="vm.cancelOrder(item)">Cancel</a></div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','ordersProviderFactory','$q','user','settings','cancelBidOrder','cancelAskOrder','HTTPNotify')
class TraderOrdersMyComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  oneClickOrders: boolean; // @input

  constructor(protected $scope: angular.IScope,
              private ordersProviderFactory: OrdersProviderFactory,
              $q: angular.IQService,
              public user: UserService,
              settings: SettingsService,
              private cancelBidOrder: CancelBidOrderService,
              private cancelAskOrder: CancelAskOrderService,
              HTTPNotify: HTTPNotifyService)
  {
    super($scope, $q);
    HTTPNotify.on(()=>{this.determineLength()}, $scope);
    var format = settings.get(SettingsService.DATEFORMAT_DEFAULT);
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.initializeVirtualRepeat(
          this.ordersProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, user.account),

          /* decorator function */
          (order: any|IHeatOrder) => {
            order.typeDisplay = order.type == 'ask' ? 'Ask' : 'Buy';
            order.market = this.currencyInfo.symbol + '/' + this.assetInfo.symbol;
            order.quantityDisplay = utils.formatQNT(order.quantity, this.assetInfo.decimals);
            order.priceDisplay = utils.formatQNT(order.price, this.currencyInfo.decimals);
            var totalQNT = utils.calculateTotalOrderPriceQNT(order.quantity, order.price);
            order.total = utils.formatQNT(totalQNT,this.currencyInfo.decimals);
            var date = utils.timestampToDate(order.expiration);
            order.expires = dateFormat(date, format);
          }
        );
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    $scope.$on("$destroy",() => {
      if (this.provider) {
        this.provider.destroy();
      }
    });
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