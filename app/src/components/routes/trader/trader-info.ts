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
  styles: [`
  trader-info .market-title {
  }
  trader-info .market-title-text * {
    font-size: 32px !important;
  }
  `],
  template: `
    <div layout="column" flex layout-fill layout-padding>
      <div layout="row" class="market-title">
        <md-button class="md-icon-button" aria-label="Show/hide markets" ng-click="vm.toggleMarkets()">
          <md-tooltip md-direction="bottom">
            Show/Hide markets
          </md-tooltip>
          <md-icon md-font-library="material-icons">{{vm.marketsSidenavOpen?'remove_circle_outline':'add_circle_outline'}}</md-icon>
        </md-button>
        <span class="market-title-text"><span ng-class="{certified:vm.currencyInfo.certified}">{{vm.currencyInfo.symbol}}</span>/<span ng-class="{certified:vm.assetInfo.certified}">{{vm.assetInfo.symbol}}</span></span>
      </div>
      <div layout="row">
        <div layout="column" flex>
          <div layout="column">24h change</div>
          <div layout="column">{{vm.hr24Change}}</div>
        </div>
        <div layout="column" flex>
          <div layout="column">24h high</div>
          <div layout="column">{{vm.hr24High}}</div>
        </div>
        <div layout="column" flex>
          <div layout="column">24h low</div>
          <div layout="column">{{vm.hr24Low}}</div>
        </div>
        <div layout="column" flex>
          <div layout="column">24h vol</div>
          <div layout="column">{{vm.hr24CurrencyVolume}}<br>{{vm.hr24AssetVolume}}
          </div>
        </div>
      </div>
      <div>
        <div>{{vm.currencyInfo.symbol}} {{vm.currencyInfo.name}} ({{vm.currencyInfo.id}})
        <a ng-href="{{vm.currencyInfo.descriptionUrl}}" target="_blank">{{vm.currencyInfo.descriptionUrl}}</a></div>
        <div>{{vm.assetInfo.symbol}} {{vm.assetInfo.name}} ({{vm.assetInfo.id}})
        <a ng-href="{{vm.assetInfo.descriptionUrl}}" target="_blank">{{vm.assetInfo.descriptionUrl}}</a></div>
      </div>
    </div>
  `
})
@Inject('$scope','heat','assetInfo')
class TraderInfoComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  account: string; // @input
  toggleMarkets: Function; // @input (controls the parent component markets sidenav)
  marketsSidenavOpen: boolean; // @input (bound to parent component markets sidenav md-is-open)

  hr24Change: string;
  hr24High: string;
  hr24Low: string;
  hr24CurrencyVolume: string;
  hr24AssetVolume: string;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfoService: AssetInfoService) {
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        unregister.forEach(fn => fn());
        this.loadMarket();
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  loadMarket() {
    this.heat.api.getMarket(this.currencyInfo.id, this.assetInfo.id, "0", 1).then((market) => {
      this.$scope.$evalAsync(() => {
        this.currencyInfo = {
          id: market.currency,
          symbol:'*',
          name:'*',
          decimals: market.currencyDecimals,
          certified: false,
          description: '',
          descriptionUrl: ''
        };
        this.assetInfo = {
          id: market.asset,
          symbol:'*',
          name:'*',
          decimals: market.assetDecimals,
          certified: false,
          description: '',
          descriptionUrl: ''
        };
        this.assetInfoService.getInfo(market.currency).then((info)=> {
          this.$scope.$evalAsync(() => {
            this.currencyInfo.symbol = info.symbol;
            this.currencyInfo.name = info.name;
            this.currencyInfo.certified = info.certified;
            this.currencyInfo.description = info.description;
            this.currencyInfo.descriptionUrl = info.descriptionUrl;
            this.hr24CurrencyVolume = utils.formatQNT(market.hr24CurrencyVolume, market.currencyDecimals) +' '+this.currencyInfo.symbol;
          });
        });
        this.assetInfoService.getInfo(market.asset).then((info)=> {
          this.$scope.$evalAsync(() => {
            this.assetInfo.symbol = info.symbol;
            this.assetInfo.name = info.name;
            this.assetInfo.certified = info.certified;
            this.assetInfo.description = info.description;
            this.assetInfo.descriptionUrl = info.descriptionUrl;
            this.hr24AssetVolume = utils.formatQNT(market.hr24AssetVolume, market.assetDecimals) +' '+this.assetInfo.symbol;
          });
        });
        this.hr24Change = `${market.hr24Change}%`
        this.hr24High = utils.formatQNT(market.hr24High, market.currencyDecimals);
        this.hr24Low = utils.formatQNT(market.hr24Low, market.currencyDecimals);
        this.hr24CurrencyVolume = utils.formatQNT(market.hr24CurrencyVolume, market.currencyDecimals) +' '+this.currencyInfo.symbol;
        this.hr24AssetVolume = utils.formatQNT(market.hr24AssetVolume, market.assetDecimals) +' '+this.assetInfo.symbol;
      });
    });
  }
}
