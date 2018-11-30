declare var Big: any;
@RouteConfig('/ardor-trader/:currency/:asset')
@Component({
  selector: 'ardorTrader',
  inputs: ['currency','asset'],
  template: `
    <div layout="row">
      <!--
      <div>
        <md-button class="md-icon-button show-hide" aria-label="Show/hide markets" ng-click="vm.toggleMarkets()">
          <md-tooltip md-direction="bottom">Show/Hide markets</md-tooltip>
          <i><img src="assets/{{vm.marketsSidenavOpen?'minusIcon':'plusIcon'}}.png"></i>
        </md-button>
      </div>
      -->
      <span flex></span>
      <trader-volume class="trader-component" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" layout="column"></trader-volume>
    </div>
    <div layout="row" flex layout-fill>
      <md-sidenav class="md-sidenav-left" md-component-id="trader-markets-sidenav"
          md-is-locked-open="vm.marketsSidenavLockedOpen" md-is-open="vm.marketsSidenavOpen"
          md-disable-backdrop flex layout-fill>
        <div class="sidenav-container">
          <ardor-trader-balances currency-info="vm.currencyInfo" asset-info="vm.assetInfo" ng-if="vm.user.unlocked"></ardor-trader-balances>
          <ardor-trader-markets></ardor-trader-markets>
        </div>
      </md-sidenav>
      <div layout="column" flex layout-fill class="main-display">
        <div>
          <div class="trader-row top">
              <ardor-trader-info class="trader-component" toggle-markets="vm.toggleMarkets" markets-sidenav-open="vm.marketsSidenavOpen" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-info>
              <trader-chart class="trader-component" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></trader-chart>
          </div>
          <div class="trader-row middle">
            <ardor-trader-orders-buy class="trader-component" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-orders-buy>
            <ardor-trader-quick-buy-sell class="trader-component" one-click-orders="vm.oneClickOrders" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-quick-buy-sell>
            <ardor-trader-orders-sell class="trader-component" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"l></ardor-trader-orders-sell>
          </div>
          <div class="trader-row bottom">
            <ardor-trader-trade-history class="trader-component" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-trade-history>
            <ardor-trader-orders-my ng-if="vm.user.unlocked" class="trader-component" one-click-orders="vm.oneClickOrders" currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-orders-my>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','user','$timeout','ardorAssetInfo','$mdSidenav')
class ArdorTraderComponent {

  currency: string; // @input
  asset: string; // @input

  currencyInfo: AssetInfo;
  assetInfo: AssetInfo;

  oneClickOrders: boolean;

  marketCurrency: string = "0";
  marketSort: string = "change";
  marketAsc: string = "false";

  toggleMarkets: Function;
  marketsSidenavOpen: boolean = true;
  marketsSidenavLockedOpen: boolean = true;

  selectedOrder: IHeatOrder; // the order currently selected in either buy-orders or sell-orders lists.

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private $timeout: angular.ITimeoutService,
              private assetInfoService: ArdorAssetInfoService,
              private $mdSidenav: angular.material.ISidenavService) {

    /* @input this is passed as method to trader-info component which has the button to call this action */
    this.toggleMarkets = () => {
      var sidenav = this.$mdSidenav("trader-markets-sidenav");
      if (sidenav.isOpen()) {
        this.marketsSidenavLockedOpen = false;
        sidenav.close();
      }
      else {
        this.marketsSidenavLockedOpen = true;
        sidenav.open();
      }
    };
    // lookup currency and asset info and pass as parameters to child components
    assetInfoService.getInfo(this.currency).then((info) => {
      $scope.$evalAsync(() => {
        this.currencyInfo = info;
      });
    });
    assetInfoService.getInfo(this.asset).then((info) => {
      $scope.$evalAsync(() => {
        this.assetInfo = info;
      });
    });

    this.user.account = user.account || "";
    let ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        unregister.forEach((fn)=>{fn()});
      }
    }
    let unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }
}
