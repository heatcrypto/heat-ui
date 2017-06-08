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
  selector: 'traderInfo',
  inputs: ['currencyInfo','assetInfo','toggleMarkets','marketsSidenavOpen'],
  template: `
    <div>
      <div class="top-row">
        <div class="market-title">
          <span class="market-title-text"><span ng-class="{certified:vm.currencyInfo.certified}">{{vm.currencyInfo.symbol}}</span>/<span ng-class="{certified:vm.assetInfo.certified}">{{vm.assetInfo.symbol}}</span></span>
        </div>
        <div ng-if="vm.isBtcAsset">
          <md-button class="md-primary" ng-click="vm.showBtcLoadPopup($event)" ng-disabled="!vm.user.unlocked">Deposit BTC</md-button>
        </div>
        <div ng-if="vm.currencyInfo.certified">
          <md-button class="md-warn" ng-click="vm.showBtcWithdrawPopup($event)" ng-disabled="!vm.user.unlocked">Withdraw {{vm.currencyInfo.symbol}}</md-button>
        </div>
      </div>
      <trader-info-asset-description currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></trader-info-asset-description>
    </div>
  `
})
@Inject('$scope','heat','user','settings', 'withdrawAsset')
class TraderInfoComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  account: string; // @input
  toggleMarkets: Function; // @input (controls the parent component markets sidenav)
  marketsSidenavOpen: boolean; // @input (bound to parent component markets sidenav md-is-open)

  isBtcAsset=false;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private user: UserService,
              private settings: SettingsService,
              private withdrawAsset: WithdrawAssetService) {
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.isBtcAsset = this.currencyInfo.id==this.settings.get(SettingsService.HEATLEDGER_BTC_ASSET);
        unregister.forEach(fn => fn());
      }
      console.log(this.currencyInfo)
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  showBtcLoadPopup($event) {
    dialogs.loadBtc($event, this.currencyInfo.id);
  }

  showBtcWithdrawPopup($event) {
    if (this.currencyInfo.symbol != 'HEAT') {
      this.withdrawAsset.dialog($event, this.currencyInfo).show();
    }
  }
}
