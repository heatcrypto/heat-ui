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
    <div layout="column" flex layout-fill layout-padding>
      <div layout="row">
        <div layout="row" class="market-title">
          <md-button class="md-icon-button show-hide" aria-label="Show/hide markets" ng-click="vm.toggleMarkets()">
            <md-tooltip md-direction="bottom">Show/Hide markets</md-tooltip>
            <md-icon md-font-library="material-icons">{{vm.marketsSidenavOpen?'remove_circle_outline':'add_circle_outline'}}</md-icon>
          </md-button>
          <span class="market-title-text"><span ng-class="{certified:vm.currencyInfo.certified}">{{vm.currencyInfo.symbol}}</span>/<span ng-class="{certified:vm.assetInfo.certified}">{{vm.assetInfo.symbol}}</span></span>
        </div>
        <div layout="row" layout-align="end" flex ng-if="vm.isBtcAsset">
          <md-button class="md-primary md-raised" ng-click="vm.showBtcLoadPopup($event)" ng-disabled="!vm.user.unlocked">Load BTC</md-button>
        </div>
      </div>
      <trader-info-asset-description currency-info="vm.currencyInfo" asset-info="vm.assetInfo" flex layout="column" layout-fill></trader-info-asset-description>
    </div>
  `
})
@Inject('$scope','heat','user','settings')
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
              private settings: SettingsService) {
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.isBtcAsset = this.currencyInfo.id==this.settings.get(SettingsService.HEATLEDGER_BTC_ASSET);
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  showBtcLoadPopup($event) {
    dialogs.loadBtc($event);
  }

}
