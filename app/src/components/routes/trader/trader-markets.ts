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
            <div class="truncate-col market-col">
              <a href="#/trader/{{item.currency}}/{{item.asset}}">
                <span ng-class="{certified:item.currencyInfo.certified}">{{item.currencyInfo.symbol}}</span>/<span ng-class="{certified:item.assetInfo.certified}">{{item.assetInfo.symbol}}</span>
              </a>
            </div>
            <div class="truncate-col change-col">{{item.change}}</div>
            <div class="truncate-col price-col">{{item.price}}</div>
            <div class="truncate-col vol-col right-align" flex>{{item.vol}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','heat','assetInfo','HTTPNotify','storage','$q','$mdToast')
class TraderMarketsComponent {

  // change, volume, price, none
  sort: string = 'change';
  asc: boolean = true;

  markets: Array<IHeatMarket> = [];
  showFakeMarketsWarning = true;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              HTTPNotify: HTTPNotifyService,
              private storage: StorageService,
              private $q: angular.IQService,
              private $mdToast: angular.material.IToastService) {
    HTTPNotify.on(()=>{this.loadMarkets()}, $scope);
    this.loadMarkets();
  }

  loadMarkets() {
    this.heat.api.getMarketsAll(this.sort, this.asc, "0", 1, 0, 100).then((markets) => {
      this.$scope.$evalAsync(() => {
        this.markets = markets;
        var promises = []; // collects all balance lookup promises
        this.markets.forEach((market: IHeatMarket|any) => {
          promises.push(
            this.assetInfo.getInfo(market.currency).then((info)=>{
              this.$scope.$evalAsync(() => {
                market.currencyInfo = {
                  symbol:info.symbol,
                  name:info.name,
                  certified:info.certified
                };
              });
            })
          );
          promises.push(
            this.assetInfo.getInfo(market.asset).then((info)=>{
              this.$scope.$evalAsync(() => {
                market.assetInfo = {
                  symbol:info.symbol,
                  name:info.name,
                  certified:info.certified
                };
              });
            })
          );
          market.change = `${market.hr24Change}%`;
          market.price = utils.formatQNT(market.lastPrice, market.currencyDecimals);
          market.vol = utils.formatQNT(market.hr24AssetVolume, market.assetDecimals);
          market.currencyInfo = {symbol:'*'};
          market.assetInfo = {symbol:'*'};
        });
        this.$q.all(promises).then(()=>{
          this.$scope.$evalAsync(() => {
            this.markets.sort((a:any,b:any)=> {
              if (a.certified < b.certified) return 1;
              if (a.certified > b.certified) return -1;
              if (a.symbol < b.symbol) return 1;
              if (a.symbol > b.symbol) return -1;
              return 0;
            });
          })
        });

        /* PATCHUP IN AWAITING OF SERVER FUNCTIONALITY - also cleanup toolbar.ts */

        var mymarkets = this.storage.namespace('trader').get('my-markets');
        if (angular.isArray(mymarkets)) {
          mymarkets = mymarkets.filter((m)=>!this.markets.find((_m)=>_m.currency==m.currency.id&&_m.asset==m.asset.id));
          this.storage.namespace('trader').put('my-markets', mymarkets);
          /* {currency:{id: currency,symbol: currencySymbol},
              asset:{id:asset,symbol: assetSymbol}} */
          var showWarning = false;
          mymarkets.forEach((m) => {
            if (m.currency && m.asset) {
              showWarning = true;
              this.markets.push(<any>{
                currency: m.currency.id,
                asset: m.asset.id,
                change: '*',
                price: '*',
                vol: '*',
                currencyInfo: {symbol:m.currency.symbol},
                assetInfo: {symbol:m.asset.symbol}
              })
            }
          });

          if (showWarning && this.showFakeMarketsWarning) {
            this.showFakeMarketsWarning = false;
            this.$mdToast.show(
              this.$mdToast.simple()
                .textContent("You must send at least one buy or sell order for the market to become visible in the HEAT network.")
                .hideDelay(6000)
            );
          }
        }
      });
    });
  }
}