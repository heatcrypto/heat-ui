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
  selector: 'traderOrdersSell',
  inputs: ['currencyInfo','assetInfo','selectedOrder'],
  template: `
    <script type="text/ng-template" id="templateId.tml">
      <div class="account-popover">
        <a href="#/explorer-account/{{item.account}}/transactions">{{item.account||item.accountName}}</a>
      </div>
    </script>
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">{{vm.assetInfo.symbol}} Sellers&nbsp;
        <span flex></span>
        <span class="balance" ng-if="vm.user.unlocked">BALANCE: {{vm.assetBalance}}&nbsp;{{vm.assetInfo.symbol}}</span>
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
@Inject('$scope','ordersProviderFactory','$q','heat','user')
class TraderOrdersSellComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input

  assetBalance: string = "*"; // formatted asset balance

  PAGE_SIZE = 100; /* VirtualRepeatComponent */

  refreshGrid:()=>void;
  refreshBalance:()=>void;

  constructor(protected $scope: angular.IScope,
              private ordersProviderFactory: OrdersProviderFactory,
              $q: angular.IQService,
              private heat: HeatService,
              private user: UserService)
  {
    super($scope, $q);

    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {

        /* initialize virtual repeat component */
        this.initializeVirtualRepeat(
          this.ordersProviderFactory.createProvider(this.currencyInfo.id, this.assetInfo.id, null, true),

          /* decorator */
          (order: IHeatOrder|any, context:any) => {
            order.priceDisplay = utils.formatQNT(order.price,this.currencyInfo.decimals);
            order.quantityDisplay = utils.formatQNT(order.unconfirmedQuantity ,this.assetInfo.decimals);
            var totalQNT = utils.calculateTotalOrderPriceQNT(order.unconfirmedQuantity, order.price);
            order.total = utils.formatQNT(totalQNT,this.currencyInfo.decimals);
          },

          /* preprocessor */
          (firstIndex: number, lastIndex: number, items: Array<IHeatOrder>) => {
            items.forEach((order) => {
              if (order['runningTotalQNT']) {
                order['sum'] = utils.formatQNT(order['sumQNT'].toString(), this.currencyInfo.decimals);
                order['runningTotal'] = utils.formatQNT(order['runningTotalQNT'].toString(), this.assetInfo.decimals);
              }
            });
          }
        );

        /* listen to order events */
        this.subscribeToOrderEvents(this.currencyInfo.id, this.assetInfo.id);

        unregister.forEach(fn => fn());
        if (this.user.unlocked) {
          this.updateAssetBalance();
          /* listen to balance events */
          this.subscribeToBalanceEvents(this.user.account, this.assetInfo.id);
        }
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    this.refreshGrid = utils.debounce(angular.bind(this, this.determineLength), 1000, false);
    this.refreshBalance = utils.debounce(angular.bind(this, this.updateAssetBalance), 1000, false);
  }

  private subscribeToOrderEvents(currency: string, asset: string) {
    this.heat.subscriber.order({currency: currency, asset: asset}, (order: IHeatOrder) => {
      if (order.type == 'ask') {
        this.refreshGrid();
      }
    }, this.$scope);
  }

  private subscribeToBalanceEvents(account:string, currency: string) {
    this.heat.subscriber.balanceChanged({account:account, currency:currency}, this.refreshBalance, this.$scope);
  }

  onSelect(selectedOrder) {
    this.selectedOrder = selectedOrder;
  }

  updateAssetBalance() {
    this.heat.api.getAccountBalanceVirtual(this.user.account, this.assetInfo.id,"0",1).then((balance)=>{
      this.$scope.$evalAsync(()=> {
        this.assetBalance = utils.formatQNT(balance.virtualBalance, this.assetInfo.decimals);
      });
    },()=>{
      this.$scope.$evalAsync(()=> {
        this.assetBalance = "?";
      });
    })
  }
}
