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
declare var Big: any;
@RouteConfig('/trader/:currency/:asset')
@Component({
  selector: 'trader',
  inputs: ['currency','asset'],
  styles: [`
  trader {
    font-size: 12px !important;
  }
  trader md-list-item {
    border-bottom: 1px solid #ddd;
  }
  trader md-list-item .md-button {
    min-height: 24px;
  }
  trader .trader-component {
    border-color: #ddd;
    margin-bottom: 4px;
  }
  trader .trader-component-title {
    font-weight: bold;
    padding-right: 16px;
    padding-left: 16px;
    padding-top: 4px;
    color: #424242;
  }
  trader trader-info {
    border-style: solid;
    border-width: 1px;
    margin-right: 2px;
  }
  trader trader-chart {
    border-style: solid;
    border-top-width: 1px;
    border-bottom-width: 1px;
    border-right-width: 1px;
    border-left-width: 0px;
  }
  trader trader-orders-buy {
    margin-right: 2px;
    border-style: solid;
    border-top-width: 0px;
    border-bottom-width: 1px;
    border-right-width: 1px;
    border-left-width: 1px;
  }
  trader trader-quick-buy-sell {
    margin-right: 2px;
    border-style: solid;
    border-top-width: 0px;
    border-bottom-width: 1px;
    border-right-width: 1px;
    border-left-width: 0px;
  }
  trader trader-orders-sell {
    border-style: solid;
    border-top-width: 0px;
    border-bottom-width: 1px;
    border-right-width: 1px;
    border-left-width: 0px;
  }
  trader trader-trade-history {
    border-style: solid;
    border-top-width: 0px;
    border-bottom-width: 1px;
    border-right-width: 1px;
    border-left-width: 1px;
  }
  trader trader-orders-my {
    border-style: solid;
    border-top-width: 0px;
    border-bottom-width: 1px;
    border-right-width: 0px;
    border-left-width: 0px;
  }
  trader trader-balances {
    border-color: #9E9E9E;
    border-style: solid;
    border-top-width: 1px;
    border-left-width: 1px;
    border-bottom-width: 0px;
    border-right-width: 0px;
    min-height: 100px;
  }
  trader trader-markets {
    border-color: #9E9E9E;
    border-style: solid;
    border-top-width: 0px;
    border-left-width: 1px;
    border-bottom-width: 0px;
    border-right-width: 0px;
  }
  /* trader md-list-item._md-button-wrap > div.md-button:first-child {
    padding-left: 0px;
  } */
  trader md-list-item.active {
    background-color: #B2DFDB;
  }
  trader md-list-item {
    min-height: 25px;
    height: 25px;
  }
  trader .truncate-col {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  `],
  template: `
    <div layout="row" flex layout-fill>
      <md-sidenav class="md-sidenav-left md-whiteframe-z1" md-component-id="trader-markets-sidenav"
          md-is-locked-open="vm.marketsSidenavLockedOpen" md-is-open="vm.marketsSidenavOpen"
          md-disable-backdrop flex layout-fill>
        <div layout="column" flex layout-fill>
          <trader-balances currency="vm.currency" asset="vm.asset" layout="column" ng-if="vm.user.unlocked"></trader-balances>
          <trader-markets currency="vm.currency" asset="vm.asset" layout="column" flex layout-fill></trader-markets>
          <trader-trollbox layout="column"></trader-trollbox>
        </div>
      </md-sidenav>
      <div layout="column" flex layout-fill>
        <div layout="column" layout-gt-sm="row" flex layout-fill>
          <trader-info class="trader-component" toggle-markets="vm.toggleMarkets" markets-sidenav-open="vm.marketsSidenavOpen" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex layout="column" layout-fill></trader-info>
          <trader-chart class="trader-component" currency="vm.currency" asset="vm.asset" flex layout="column" layout-fill></trader-chart>
        </div>
        <div layout="column" layout-gt-sm="row" flex layout-fill>
          <trader-orders-buy class="trader-component" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex layout="column" layout-fill></trader-orders-buy>
          <trader-quick-buy-sell class="trader-component" one-click-orders="vm.oneClickOrders" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex layout="column" layout-fill></trader-quick-buy-sell>
          <trader-orders-sell class="trader-component" selected-order="vm.selectedOrder" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex layout="column" layout-fill></trader-orders-sell>
        </div>
        <div layout="column" layout-gt-sm="row" flex layout-fill>
          <trader-trade-history class="trader-component" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex="40" layout="column" layout-fill></trader-trade-history>
          <trader-orders-my ng-if="vm.user.unlocked" class="trader-component" one-click-orders="vm.oneClickOrders" currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex="60" layout="column" layout-fill></trader-orders-my>
        </div>
      </div>
    </div>

        <!--
        <trader-markets currency="vm.marketCurrency" sort="vm.marketSort" asc="vm.marketAsc" flex layout="column" layout-fill></trader-markets>
        <trader-trollbox currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-trollbox>
        <trader-chart currency="vm.currency" asset="vm.asset" flex layout="column" layout-fill style="min-height:200px"></trader-chart>
        <trader-market-label currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-market-label>
        <trader-market-volume-price currency="vm.currency" asset="vm.asset" flex layout="column" layout-fill></trader-market-volume-price>
        <trader-markets currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-markets>
        <trader-orders-buy currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-orders-buy>
        <trader-orders-sell currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-orders-sell>
        <trader-orders-my currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-orders-my>
        <trader-quick-buy currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-quick-buy>
        <trader-quick-sell currency="vm.currency" asset="vm.asset" account="vm.user.account" flex layout="column" layout-fill></trader-quick-sell>
        -->
  `
})
@Inject('$scope','user','$timeout','assetInfo','$mdSidenav')
class TraderComponent {

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
              private assetInfoService: AssetInfoService,
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
  }
}