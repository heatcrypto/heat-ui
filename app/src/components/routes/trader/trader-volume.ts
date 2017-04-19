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
  selector: 'traderVolume',
  inputs: ['currencyInfo','assetInfo'],
  styles: [`
    trader-volume .label, trader-volume .value {
      padding-right:8px;
    }
    trader-volume .value {
      font-weight: bold;
    }
  `],
  template: `
    <div layout="row" flex layout-fill layout-align="end">
      <div class="label">24h change</div>
      <div class="value">{{vm.hr24Change}}</div>
      <div class="label">24h high</div>
      <div class="value">{{vm.hr24High}}</div>
      <div class="label">24h low</div>
      <div class="value">{{vm.hr24Low}}</div>
      <div class="label">24h vol</div>
      <div class="value">{{vm.hr24CurrencyVolume}}</div>
      <div class="label">24h vol</div>
      <div class="value">{{vm.hr24AssetVolume}}</div>
    </div>
  `
})
@Inject('$scope','heat')
class TraderVolumeComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  hr24Change: string;
  hr24High: string;
  hr24Low: string;
  hr24CurrencyVolume: string;
  hr24AssetVolume: string;

  constructor(private $scope: angular.IScope, private heat: HeatService) {
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
        this.hr24Change = `${(parseFloat(market.hr24Change)>0?'+':'')}${market.hr24Change}%`
        this.hr24High = utils.formatQNT(market.hr24High, market.currencyDecimals);
        this.hr24Low = utils.formatQNT(market.hr24Low, market.currencyDecimals);
        this.hr24CurrencyVolume = utils.formatQNT(market.hr24CurrencyVolume, market.currencyDecimals) +' '+this.currencyInfo.symbol;
        this.hr24AssetVolume = utils.formatQNT(market.hr24AssetVolume, market.assetDecimals) +' '+this.assetInfo.symbol;
      });
    });
  }
}