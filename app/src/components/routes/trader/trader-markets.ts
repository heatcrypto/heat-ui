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
  selector: 'traderMarkets',
  styles: [`
    trader-markets input {
      width: 100%;
      padding: 4px;
      margin: 8px;
    }
    trader-markets .market-col {
      text-align:left;
      width: 80px;
    }
    trader-markets .change-col {
      text-align:left;
      width: 40px;
    }
    trader-markets .price-col {
      text-align:left;
      width: 80px;
    }
    trader-markets .vol-col {
      width: 60px;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Markets&nbsp;
        <span flex></span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <div layout="row">
        <input type="text" disabled placeholder="Search markets"></input>
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item>
          <div class="truncate-col market-col">Market</div>
          <div class="truncate-col change-col">Change</div>
          <div class="truncate-col price-col">Price</div>
          <div class="truncate-col vol-col" flex>Vol</div>
        </md-list-item>
        <md-virtual-repeat-container flex layout-fill layout="column"
            virtual-repeat-flex-helper ng-if="vm.markets.length>0">
          <md-list-item md-virtual-repeat="item in vm.markets">
            <div class="truncate-col market-col"><a href="#/trader/{{item.currency}}/{{item.asset}}">{{item.market}}</a></div>
            <div class="truncate-col change-col">{{item.change}}</div>
            <div class="truncate-col price-col">{{item.price}}</div>
            <div class="truncate-col vol-col right-align" flex>{{item.vol}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','heat','assetInfo','HTTPNotify','storage')
class TraderMarketsComponent {

  // change, volume, price, none
  sort: string = 'change';
  asc: boolean = true;

  markets: Array<IHeatMarket> = [];

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              HTTPNotify: HTTPNotifyService,
              private storage: StorageService) {
    HTTPNotify.on(()=>{this.loadMarkets()}, $scope);
    this.loadMarkets();
  }

  loadMarkets() {
    this.heat.api.getMarketsAll(this.sort, this.asc, "0", 1, 0, 100).then((markets) => {
      this.$scope.$evalAsync(() => {
        this.markets = markets;
        this.markets.forEach((market: IHeatMarket|any) => {
          var currencyInfo = this.assetInfo.parseProperties(market.currencyProperties, {
            name: "",
            symbol: market.currency == "0" ? "HEAT" : market.currency
          });
          var assetInfo = this.assetInfo.parseProperties(market.assetProperties, {
            name: "",
            symbol: market.asset == "0" ? "HEAT" : market.asset
          });
          market.market = `${currencyInfo.symbol}/${assetInfo.symbol}`;
          market.change = `${market.hr24Change}%`;
          market.price = utils.formatQNT(market.lastPrice, market.currencyDecimals);
          market.vol = utils.formatQNT(market.hr24AssetVolume, market.assetDecimals);
        });

        /* PATCHUP IN AWAITING OF SERVER FUNCTIONALITY - also cleanup toolbar.ts */

        var mymarkets = this.storage.namespace('trader').get('my-markets');
        if (angular.isArray(mymarkets)) {
          mymarkets = mymarkets.filter((m)=>!this.markets.find((_m)=>_m.currency==m.currency&&_m.asset==m.asset));
          this.storage.namespace('trader').put('my-markets', mymarkets);
          /* {currency:{id: currency,symbol: currencySymbol},
              asset:{id:asset,symbol: assetSymbol}} */
          mymarkets.forEach((m) => {
            this.markets.find((_m)=>_m.currency==m.currency&&_m.asset==m.asset)

            if (m.currency && m.asset) {
              this.markets.push(<any>{
                market: m.currency.symbol+'/'+m.asset.symbol,
                currency: m.currency.id,
                asset: m.asset.id,
                change: '*',
                price: '*',
                vol: '*'
              })
            }
          });
        }
      });
    });
  }
}