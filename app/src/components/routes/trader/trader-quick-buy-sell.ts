/*
 * The MIT License (MIT)
 * Copyright (c) 208 Heat Ledger Ltd.
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
heat.Loader.directive("maxDecimals", ['$mdToast', ($mdToast) => {
  return {
    require: 'ngModel',
    link: function(scope, elem, attr, ngModel) {

      var decimals;
      var notifyUser = utils.debounce(() => {
        $mdToast.show(
          $mdToast.simple().textContent(`Too many decimals, max ${decimals} allowed`).hideDelay(3000)
        )
      }, 500, true);

      //For DOM -> model validation
      ngModel.$parsers.unshift(function(value) {
        decimals = parseInt(attr.maxDecimals);
        var valid = !utils.hasToManyDecimals(value, decimals);
        ngModel.$setValidity('decimals', valid);
        if (!valid) {
          notifyUser();
        }
        return valid ? value : undefined;
      });
    }
  }
}]);

@Component({
  selector: 'traderQuickBuySell',
  inputs: ['currencyInfo','assetInfo','selectedOrder','oneClickOrders'],
  template: `
    <div>
      <div class="trader-component-title">Buy/Sell&nbsp;<elipses-loading ng-show="vm.loading"></elipses-loading></div>
      <form name="quickBuySellForm">
        <div class="row">
          <span class="label">
            Unit price
          </span>
          <span>
            <input id="trader-quick-buy-sell-price-input" type="text" ng-model="vm.price" required max-decimals="{{vm.currencyInfo.decimals}}"
              ng-change="vm.recalculate()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </span>
          <span class="label">
            {{vm.currencyInfo.symbol}} / {{vm.assetInfo.symbol}}
          </span>
        </div>
        <div class="row">
          <span class="label">
            Amount
          </span>
          <span>
            <input id="trader-quick-buy-sell-quantity-input" type="text" ng-model="vm.quantity" required max-decimals="{{vm.assetInfo.decimals}}"
              ng-change="vm.recalculate()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </span>
          <span class="label">
            {{vm.assetInfo.symbol}}
          </span>
        </div>
        <div class="row">
          <span class="label">
            Fees
          </span>
          <span class="fee">
            {{vm.fee}}
          </span>
          <span class="label">
            HEAT
          </span>
        </div>
        <div class="row">
          <span class="label">
            Expiry in
          </span>
          <span>
            <input type="text" ng-model="vm.expiry" required ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </span>
          <span class="label">
            Minutes
          </span>
        </div>
        <div class="row">
          <span class="label">
            Total
          </span>
          <span>
            <input type="text" id="trader-quick-buy-sell-total-input" ng-model="vm.total" required max-decimals="{{vm.currencyInfo.decimals}}"
              ng-change="vm.recalculateTotal()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </span>
          <span class="label">
            {{vm.currencyInfo.symbol}}
          </span>
        </div>
        <div ng-hide="vm.user.unlocked">
          <md-button class="md-primary" aria-label="Sign in" href="#/login">
            Sign in to trade
          </md-button>
        </div>
        <div ng-show="vm.user.unlocked" class="row bottom-row">
          <div>
            <md-button class="md-primary" aria-label="Buy" ng-click="vm.quickBid($event)" ng-disabled="quickBuySellForm.$invalid">
              BUY
            </md-button>
          </div>
          <div>
            <md-switch ng-model="vm.oneClickOrders" aria-label="1-click orders" class="md-primary" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
              <span ng-show="vm.oneClickOrders"><b>1-click orders enabled</b></span><span ng-hide="vm.oneClickOrders">1-click orders disabled</span>
            </md-switch>
          </div>
          <div>
            <md-button class="md-warn" aria-label="Sell" ng-click="vm.quickAsk($event)" ng-disabled="quickBuySellForm.$invalid">
              SELL
            </md-button>
          </div>
        </div>
      </form>
    </div>
  `
})
@Inject('$scope','$q','$mdToast','placeAskOrder','placeBidOrder','user')
class TraderQuickBuySellComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input
  oneClickOrders: boolean; // @input

  quantity: string = '0';
  price: string = '0';
  expiry: string = '360000'
  total: string = null;
  fee: string = utils.formatQNT(HeatAPI.fee.standard,8); // fee in HEAT

  constructor(private $scope: angular.IScope,
              private $q: angular.IQService,
              private $mdToast: angular.material.IToastService,
              private placeAskOrder: PlaceAskOrderService,
              private placeBidOrder: PlaceBidOrderService,
              public user: UserService) {
    $scope.$watch('vm.selectedOrder', () => {
      if (this.selectedOrder) {
        this.quantity = this.selectedOrder['runningTotal'];
        this.price = utils.formatQNT(this.selectedOrder.price, this.currencyInfo.decimals);
        this.total = this.selectedOrder['sum'];
      }
    });
  }

  quickAsk($event) {
    var dialog = this.placeAskOrder.dialog(this.currencyInfo,this.assetInfo,utils.unformat(this.price),
                      utils.unformat(this.quantity),parseInt(this.expiry),true,$event);
    if (this.oneClickOrders)
      dialog.send()
    else
      dialog.show()
  }

  quickBid($event) {
    var dialog = this.placeBidOrder.dialog(this.currencyInfo,this.assetInfo,utils.unformat(this.price),
                      utils.unformat(this.quantity),parseInt(this.expiry),true,$event);
    if (this.oneClickOrders)
      dialog.send()
    else
      dialog.show()
  }

  calculateTotalPrice() {
    try {
      var price = utils.unformat(this.price) || "0";
      var quantity = utils.unformat(this.quantity) || "0";
      if (price == "0" || quantity == "0") {
        return "";
      }
      else {
        var quantityQNT = utils.convertToQNT(quantity);
        var priceQNT = utils.convertToQNT(price);
        var totalQNT = utils.calculateTotalOrderPriceQNT(quantityQNT, priceQNT);
        return utils.formatQNT(totalQNT, this.currencyInfo.decimals, true);
      }
    } catch (e) {
      return "";
    }
  }

  // user edited quantity or price - recalculate total.
  recalculate() {
    this.total = this.calculateTotalPrice();
  }

  // user edited total - recalculate quantity based on provided price
  recalculateTotal() {
    try {
      var price = utils.unformat(this.price) || "0";
      var total = utils.unformat(this.total) || "0";
      if (price == "0" || total == "0") {
        this.quantity = "0";
      }
      else {
        this.quantity = new Big(total).div(new Big(price)).toFixed(this.assetInfo.decimals).toString();
      }
    } catch (e) {
      console.log(e);
    }
  }
}