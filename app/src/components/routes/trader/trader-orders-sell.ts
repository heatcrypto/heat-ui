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
  styles: [`
    trader-orders-sell .price-col, trader-orders-sell .quantity-col, trader-orders-sell .total-col {
      width: 80px;
    }
    trader-orders-sell .sum-col {
      text-align: right;
      width: 80px;
      min-width: 80px;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Sell {{vm.assetInfo.symbol}}&nbsp;
        <span flex></span>
        <span ng-if="vm.user.unlocked">BALANCE: {{vm.assetBalance}}&nbsp;{{vm.assetInfo.symbol}}</span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column" ng-if="vm.currencyInfo&&vm.assetInfo">
        <md-list-item>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col quantity-col">Quantity</div>
          <div class="truncate-col total-col">Total</div>
          <div class="truncate-col sum-col" flex>Sum ({{vm.currencyInfo.symbol}})</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand
               ng-click="vm.select(item)" aria-label="Entry"
               ng-class="{'virtual': item.unconfirmed, 'currentlyNotValid': item.currentlyNotValid}">
            <div class="truncate-col price-col">{{item.priceDisplay}}</div>
            <div class="truncate-col quantity-col">{{item.quantityDisplay}}</div>
            <div class="truncate-col total-col">{{item.total}}</div>
            <div class="truncate-col sum-col" flex>{{item.sum}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','ordersProviderFactory','$q','heat','user','HTTPNotify')
class TraderOrdersSellComponent extends VirtualRepeatComponent  {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input

  assetBalance: string = "*"; // formatted asset balance

  PAGE_SIZE = 250; /* VirtualRepeatComponent */

  constructor(protected $scope: angular.IScope,
              private ordersProviderFactory: OrdersProviderFactory,
              $q: angular.IQService,
              private heat: HeatService,
              private user: UserService,
              HTTPNotify: HTTPNotifyService)
  {
    super($scope, $q);
    HTTPNotify.on(()=>{
      this.determineLength();
      this.updateAssetBalance();
    }, $scope);
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
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
            if (firstIndex == 0) {
              var sum = new Big("0");
              var runningTotal = new Big("0");
              items.forEach((order)=> {
                var totalQNT = utils.calculateTotalOrderPriceQNT(order.unconfirmedQuantity, order.price);
                sum = sum.add(new Big(totalQNT));
                runningTotal = runningTotal.add(new Big(order.unconfirmedQuantity));
                order['sum'] = utils.formatQNT(sum.toString(),this.currencyInfo.decimals);
                order['runningTotal'] = utils.formatQNT(runningTotal.toString(),this.assetInfo.decimals);
              });
            }
          }
        );
        unregister.forEach(fn => fn());
        if (this.user.unlocked) {
          this.updateAssetBalance();
        }
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    $scope.$on("$destroy",() => {
      if (this.provider) {
        this.provider.destroy()
      }
    });
  }

  onSelect(selectedOrder) {
    this.selectedOrder = selectedOrder;
  }

  updateAssetBalance() {
    this.heat.api.getAccountBalanceVirtual(this.user.account, this.assetInfo.id,"0",1).then((balance)=>{
      this.$scope.$evalAsync(()=> {
        this.assetBalance = utils.formatQNT(balance.virtualBalance, this.assetInfo.decimals);
        //this.assetBalance = utils.formatQNT(balance.balance, this.assetInfo.decimals);
      });
    },()=>{
      this.$scope.$evalAsync(()=> {
        this.assetBalance = "?";
      });
    })
  }
}