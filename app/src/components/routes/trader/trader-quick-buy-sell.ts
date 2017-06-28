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
          <div class="label">
            Unit price
          </div>
          <div class="input">
            <input id="trader-quick-buy-sell-price-input" type="text" ng-model="vm.price" required max-decimals="{{vm.currencyInfo.decimals}}"
              ng-change="vm.recalculate()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </div>
          <div class="label">
            {{vm.currencyInfo.symbol}} / {{vm.assetInfo.symbol}}
          </div>
        </div>
        <div class="row">
          <div class="label">
            Amount
          </div>
          <div class="input">
            <input id="trader-quick-buy-sell-quantity-input" type="text" ng-model="vm.quantity" required max-decimals="{{vm.assetInfo.decimals}}"
              ng-change="vm.recalculate()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </div>
          <div class="label">
            {{vm.assetInfo.symbol}}
          </div>
        </div>
        <div class="row">
          <div class="label">
            Fees
          </div>
          <div class="fee input">
            {{vm.fee}}
          </div>
          <div class="label">
            HEAT
          </div>
        </div>
        <div class="row">
          <div class="label" ng-class="{'expires-invalid': !vm.expiryValid}">
            Expires in
          </div>
          <div class="input">
            <input type="number" ng-model="vm.expiryUnitsValue" required name="expiry"
                      ng-change="vm.expiryUnitsValueChanged()"
                      min="{{vm.expiryUnitsOptions[vm.expiryUnits].min}}"
                      max="{{vm.expiryUnitsOptions[vm.expiryUnits].max}}"
                      ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </div>
          <div class="label">
            <md-menu>
              <a ng-click="$mdMenu.open($event)">
                <md-tooltip>{{vm.expiresTooltip}}</md-tooltip>
                {{vm.expiryUnitsOptions[vm.expiryUnits].label}}
              </a>
              <md-menu-content width="4">
                <md-menu-item>
                  <md-button ng-click="vm.expiryUnits='minutes';vm.expiryUnitsValueChanged()">Minutes</md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button ng-click="vm.expiryUnits='hours';vm.expiryUnitsValueChanged()">Hours</md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button ng-click="vm.expiryUnits='days';vm.expiryUnitsValueChanged()">Days</md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button ng-click="vm.expiryUnits='weeks';vm.expiryUnitsValueChanged()">Weeks</md-button>
                </md-menu-item>
              </md-menu-content>
            </md-menu>
          </div>
        </div>
        <div class="row">
          <div class="label">
            Total
          </div>
          <div class="input">
            <input type="text" id="trader-quick-buy-sell-total-input" ng-model="vm.total" required max-decimals="{{vm.currencyInfo.decimals}}"
              ng-change="vm.recalculateTotal()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </div>
          <div class="label">
            {{vm.currencyInfo.symbol}}
          </div>
        </div>
        <div ng-hide="vm.user.unlocked" class="row bottom-row">
          <md-button class="md-primary" aria-label="Sign in" href="#/login">
            Sign in to trade
          </md-button>
        </div>
        <div ng-show="vm.user.unlocked" class="row bottom-row">
          <div>
            <md-button class="md-primary" aria-label="Buy" ng-click="vm.quickBid($event)" ng-disabled="quickBuySellForm.$invalid||!vm.expiryValid">
              BUY
            </md-button>
          </div>
          <div>
            <md-switch ng-model="vm.oneClickOrders" aria-label="1-click orders" class="md-primary" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
              <span ng-show="vm.oneClickOrders"><b>1-click orders enabled</b></span><span ng-hide="vm.oneClickOrders">1-click orders disabled</span>
            </md-switch>
          </div>
          <div>
            <md-button class="md-warn" aria-label="Sell" ng-click="vm.quickAsk($event)" ng-disabled="quickBuySellForm.$invalid||!vm.expiryValid">
              SELL
            </md-button>
          </div>
        </div>
      </form>
    </div>
  `
})
@Inject('$scope','$q','$mdToast','placeAskOrder','placeBidOrder','user','settings')
class TraderQuickBuySellComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input
  oneClickOrders: boolean; // @input

  quantity: string = '0';
  price: string = '0';
  total: string = null;
  fee: string = utils.formatQNT(HeatAPI.fee.standard,8); // fee in HEAT
  isTestnet: boolean;

  EXPIRY_MIN = 3600;
  EXPIRY_MAX = 3600 * 24 * 30;

  expiryUnitsOptions = {
    'minutes': {
      label: 'Minutes',
      min: Math.round(this.EXPIRY_MIN / 60),
      max: Math.round(this.EXPIRY_MAX / 60),
      delta: 60
    },
    'hours': {
      label: 'Hours',
      min: Math.round(this.EXPIRY_MIN / (60*60)),
      max: Math.round(this.EXPIRY_MAX / (60*60)),
      delta: 60*60
    },
    'days': {
      label: 'Days',
      min: 1,
      max: 30,
      delta: (60*60*24)
    },
    'weeks': {
      label: 'Weeks',
      min: 1,
      max: 4,
      delta: (60*60*24*7)
    }
  }
  expiryUnits = 'days';
  expiryUnitsValue = 30;
  expiry: number;
  expiryValid: boolean;
  expiresTooltip: string = '';

  // displays the toast in debounce wrapper
  notifyUser: (text:string)=>void;

  constructor(private $scope: angular.IScope,
              private $q: angular.IQService,
              private $mdToast: angular.material.IToastService,
              private placeAskOrder: PlaceAskOrderService,
              private placeBidOrder: PlaceBidOrderService,
              public user: UserService,
              private settings: SettingsService) {
    $scope.$watch('vm.selectedOrder', () => {
      if (this.selectedOrder) {
        this.quantity = this.selectedOrder['runningTotal'];
        this.price = utils.formatQNT(this.selectedOrder.price, this.currencyInfo.decimals);
        this.total = this.selectedOrder['sum'];

        if (this.selectedOrder.type == 'bid' && angular.isString(this.assetInfo.userBalance)) {
          let quantityQNT = new Big(utils.convertToQNT(utils.unformat(this.quantity)));
          let balanceQNT = new Big(this.assetInfo.userBalance);
          if (balanceQNT.lt(quantityQNT)) {
            this.quantity = utils.formatQNT(this.assetInfo.userBalance, 8);
            this.recalculate();
          }
        }
        else if (this.selectedOrder.type == 'ask' && angular.isString(this.currencyInfo.userBalance)) {
          let totalQNT = new Big(utils.convertToQNT(utils.unformat(this.total)));
          let balanceQNT = new Big(this.currencyInfo.userBalance);
          if (balanceQNT.lt(totalQNT)) {
            this.total = utils.formatQNT(this.currencyInfo.userBalance, 8);
            this.recalculateTotal();
          }
        }
      }
    });
    this.isTestnet = heat.isTestnet;

    this.notifyUser = utils.debounce((text: string) => {
      $mdToast.show($mdToast.simple().textContent(text).hideDelay(3000));
    }, 500, true);
    this.expiryUnitsValueChanged(true);
  }

  expiryUnitsValueChanged(suppressNotification?: boolean) {
    this.expiry = parseInt(this.expiryUnitsValue+'') * this.expiryUnitsOptions[this.expiryUnits].delta;
    this.expiryValid = false;
    this.expiresTooltip = '';

    if (this.expiry <= this.EXPIRY_MAX && this.expiry >= this.EXPIRY_MIN) {
      this.expiryValid = true;
      let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
      let date = new Date(Date.now() + (this.expiry*1000));
      let dateFormatted = dateFormat(date, format);
      this.expiresTooltip = `This order will expiry if (even partially) unfilled by ${dateFormatted}`;
    }
    else {
      let min = this.expiryUnitsOptions[this.expiryUnits].min;
      let max = this.expiryUnitsOptions[this.expiryUnits].max;
      let units = this.expiryUnitsOptions[this.expiryUnits].label;
      this.expiresTooltip = `Min expiry in ${units} is ${min}, max expiry in ${units} is ${max}`;
      this.notifyUser(this.expiresTooltip);
    }
  }

  quickAsk($event) {
    if (angular.isString(this.assetInfo.userBalance)) {
      let quantityQNT = new Big(utils.convertToQNT(utils.unformat(this.quantity)));
      let balanceQNT = new Big(this.assetInfo.userBalance);
      if (balanceQNT.lt(quantityQNT)) {
        this.notifyUser(`Insufficient ${this.assetInfo.symbol} balance`);
        return;
      }
    }
    var dialog = this.placeAskOrder.dialog(this.currencyInfo,this.assetInfo,utils.unformat(this.price),
                      utils.unformat(this.quantity),parseInt(this.expiry+''),true,$event);
    if (this.oneClickOrders)
      dialog.send()
    else
      dialog.show()
  }

  quickBid($event) {
    if (angular.isString(this.currencyInfo.userBalance)) {
      let totalQNT = new Big(utils.convertToQNT(utils.unformat(this.total)));
      let balanceQNT = new Big(this.currencyInfo.userBalance);
      if (balanceQNT.lt(totalQNT)) {
        this.notifyUser(`Insufficient ${this.currencyInfo.symbol} balance`);
        return;
      }
    }
    var dialog = this.placeBidOrder.dialog(this.currencyInfo,this.assetInfo,utils.unformat(this.price),
                      utils.unformat(this.quantity),parseInt(this.expiry+''),true,$event);
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
