@Component({
  selector: 'ardorTraderQuickBuySell',
  inputs: ['currencyInfo', 'assetInfo', 'selectedOrder', 'oneClickOrders'],
  template: `
    <div>
      <div class="trader-component-title">Buy/Sell&nbsp;<elipses-loading ng-show="vm.loading"></elipses-loading></div>
      <form name="quickBuySellForm">
        <div class="row">
          <div class="label">
            Unit price
          </div>
          <div class="input">
            <input id="trader-quick-buy-sell-price-input" type="text" ng-model="vm.price" required
              ng-change="vm.recalculateTotal()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
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
            <input id="trader-quick-buy-sell-quantity-input" type="text" ng-model="vm.quantity"
              ng-change="vm.recalculateTotal()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
          </div>
          <div class="label">
            {{vm.assetInfo.symbol}}
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
                      ng-disabled="true">
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
              ng-change="vm.recalculateAmount()" ng-disabled="!vm.currencyInfo||!vm.assetInfo">
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
          <md-switch ng-model="vm.oneClickOrders" aria-label="1-click orders" class="md-primary" ng-disabled="true">
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
@Inject('$scope', '$q', '$mdToast', 'user', 'settings', 'ardorBlockExplorerService')
class ArdorTraderQuickBuySellComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  selectedOrder: IHeatOrder; // @input
  oneClickOrders: boolean; // @input

  quantity: string = '0';
  price: string = '0';
  total: string = null;
  fee: string = utils.formatQNT(HeatAPI.fee.standard, 8); // fee in HEAT

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
      min: Math.round(this.EXPIRY_MIN / (60 * 60)),
      max: Math.round(this.EXPIRY_MAX / (60 * 60)),
      delta: 60 * 60
    },
    'days': {
      label: 'Days',
      min: 1,
      max: 30,
      delta: (60 * 60 * 24)
    },
    'weeks': {
      label: 'Weeks',
      min: 1,
      max: 4,
      delta: (60 * 60 * 24 * 7)
    }
  }
  expiryUnits = 'days';
  expiryUnitsValue = 30;
  expiry: number;
  expiryValid: boolean;
  expiresTooltip: string = '';

  // displays the toast in debounce wrapper
  notifyUser: (text: string) => void;

  constructor(private $scope: angular.IScope,
    private $q: angular.IQService,
    private $mdToast: angular.material.IToastService,
    public user: UserService,
    private settings: SettingsService,
    private ardorBlockExplorerService: ArdorBlockExplorerService) {

    $scope.$on('price', (event, opts) => {
      this.price = opts.price.toFixed(8);
      this.quantity = opts.balance.toFixed(8);
      this.total = opts.total.toFixed(8);
    })

    $scope.$watch('vm.selectedOrder', () => {
      if (this.selectedOrder) {
        let price = parseFloat(utils.formatQNT(this.selectedOrder.price))
        price = 1/price
        this.price = price.toFixed(this.currencyInfo.decimals)

        if (this.selectedOrder.type == 'bid' && angular.isString(this.assetInfo.userBalance)) {
          this.quantity = utils.formatQNT(this.assetInfo.userBalance, this.assetInfo.decimals)
          let total = parseFloat(utils.unformat(this.price)) * parseFloat(utils.unformat(this.quantity))
          this.total = String(total)
        }
        else if (this.selectedOrder.type == 'ask' && angular.isString(this.currencyInfo.userBalance)) {
          this.total = utils.formatQNT(this.currencyInfo.userBalance, this.currencyInfo.decimals)
          let quantity = parseFloat(utils.unformat(this.total)) / parseFloat(utils.unformat(this.price))
          this.quantity = String(quantity)
        }
      }
    });

    this.notifyUser = utils.debounce((text: string) => {
      $mdToast.show($mdToast.simple().textContent(text).hideDelay(3000));
    }, 500, true);
    this.expiryUnitsValueChanged(true);
  }

  expiryUnitsValueChanged(suppressNotification?: boolean) {
    this.expiry = parseInt(this.expiryUnitsValue + '') * this.expiryUnitsOptions[this.expiryUnits].delta;
    this.expiryValid = false;
    this.expiresTooltip = '';

    if (this.expiry <= this.EXPIRY_MAX && this.expiry >= this.EXPIRY_MIN) {
      this.expiryValid = true;
      let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
      let date = new Date(Date.now() + (this.expiry * 1000));
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
    console.log('qa')
    if (angular.isString(this.assetInfo.userBalance)) {
      let quantityQNT = parseInt(utils.unformat(this.quantity));
      let balanceQNT = parseInt(utils.unformat(this.currencyInfo.userBalance))
      if (balanceQNT < quantityQNT) {
        this.notifyUser(`Insufficient ${this.assetInfo.symbol} balance`);
        return;
      }
      let price = parseInt(this.price)
      this.ardorBlockExplorerService.sendTransactionWithSecret(`placeAskOrder&chain=2&asset=${this.currencyInfo.id}&quantityQNT=${quantityQNT}&priceNQTPerShare=${price}&secretPhrase=${this.user.secretPhrase}&feeNQT=3030000`)
    }
  }

  quickBid($event) {
    console.log('qb')
    if (angular.isString(this.currencyInfo.userBalance)) {
      let total = parseInt(utils.unformat(this.total));
      let balanceQNT = parseInt(utils.unformat(this.currencyInfo.userBalance))
      if (balanceQNT < total) {
        this.notifyUser(`Insufficient ${this.currencyInfo.symbol} balance`);
        return;
      }
      let price = parseInt(this.price)
      this.ardorBlockExplorerService.sendTransactionWithSecret(`placeBidOrder&chain=2&asset=${this.currencyInfo.id}&quantityQNT=${total}&priceNQTPerShare=${price}&secretPhrase=${this.user.secretPhrase}&feeNQT=3030000`)
    }
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

  recalculateTotal() {
    try {
      var price = utils.unformat(this.price) || "0";
      var quantity = utils.unformat(this.quantity) || "0";
      if (price == "0" || quantity == "0") {
        this.total = "0";
      }
      else {
        this.total = String(parseFloat(utils.unformat(this.price)) * parseFloat(utils.unformat(this.quantity)))
      }
    } catch (e) {
      console.log(e);
    }
  }

  recalculateAmount() {
    try {
      var price = utils.unformat(this.price) || "0";
      var total = utils.unformat(this.total) || "0";
      if (price == "0" || total == "0") {
        this.quantity = "0";
      }
      else {
        this.quantity = String(parseFloat(utils.unformat(this.total)) / parseFloat(utils.unformat(this.price)))
      }
    } catch (e) {
      console.log(e);
    }
  }
}
