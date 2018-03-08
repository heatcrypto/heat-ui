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
  template: `
    <div class="trader-component-title" layout="row">Markets&nbsp;
      <span flex></span>
      <elipses-loading ng-show="vm.loading"></elipses-loading>
      <a ng-if="!isTestnet" ng-click="vm.toggleShowCertified()" class="configure">Show {{vm.showCertified?'uncertified':'certified only'}}</a>
    </div>
    <input type="text" placeholder="Search markets" ng-model="vm.filter" ng-change="vm.onFilterChange()"></input>
    <md-list flex layout-fill layout="column">
      <md-list-item>
        <div class="truncate-col market-col">Market</div>
        <div class="truncate-col change-col">Change</div>
        <div class="truncate-col price-col">Price</div>
        <div class="truncate-col vol-col" flex>Vol</div>
      </md-list-item>
      <md-virtual-repeat-container flex layout-fill layout="column"
          virtual-repeat-flex-helper ng-if="vm.markets.length>0">
        <md-list-item md-virtual-repeat="item in vm.markets | filter: vm.filterFunc">
          <div class="truncate-col market-col">
            <a href="#/trader/{{item.currency}}/{{item.asset}}">
              <span ng-class="{certified:item.currencyInfo.certified}">{{item.currencyInfo.symbol}}</span>/<span ng-class="{certified:item.assetInfo.certified}">{{item.assetInfo.symbol}}</span>
            </a>
          </div>
          <div class="truncate-col change-col">{{item.change}}</div>
          <div class="truncate-col price-col">{{item.price}}</div>
          <div class="truncate-col vol-col right-align" flex>{{ item.vol }}</div>
        </md-list-item>
      </md-virtual-repeat-container>
    </md-list>
  `
})

@Inject('$scope','heat','assetInfo','storage','$q','$mdToast','$interval')
class TraderMarketsComponent {

  // change, volume, price, none
  sort: string = 'change';
  asc: boolean = true;
  filter: string = '';
  filterFunc: Function;

  showCertified = sessionStorage.getItem('trader.markets.showUncertified')!='true';
  preMarkets: Array<IHeatMarket> = [null, null]; //initialized to be not equals this.markets
  markets: Array<IHeatMarket> = [];
  showFakeMarketsWarning = true;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              private storage: StorageService,
              private $q: angular.IQService,
              private $mdToast: angular.material.IToastService,
              private $interval: angular.IIntervalService) {
    this.filterFunc = (item) => this.filterFuncImpl(item);
    var refresh = utils.debounce(angular.bind(this, this.loadMarkets), 5*1000, false);
    heat.subscriber.trade({}, (trade)=> refresh, $scope);
    this.loadMarkets();

    let interval = $interval(()=>{
      this.loadMarkets();
    }, 20*1000, 0, false);
    $scope.$on('$destroy',()=>{$interval.cancel(interval)});
  }

  loadMarkets() {
    this.heat.api.getMarketsAll(this.sort, this.asc, "0", 1, 0, 100).then((markets) => {
      this.$scope.$evalAsync(() => {
        if ( this.matchToPreMarkets(markets) )
          return //do not to do extra job
        this.markets = markets
        var promises = []; // collects all balance lookup promises
        this.markets.forEach((market: IHeatMarket|any) => {
          promises.push(
            this.assetInfo.getInfo(market.currency).then((info)=>{
              this.$scope.$evalAsync(() => {
                market.currencyInfo = info;
              });
            })
          );
          promises.push(
            this.assetInfo.getInfo(market.asset).then((info)=>{
              this.$scope.$evalAsync(() => {
                market.assetInfo = info;
              });
            })
          );
          market.change = `${(parseFloat(market.hr24Change)>0?'+':'')}${market.hr24Change}%`;
          market.price = utils.formatQNT(market.lastPrice, market.currencyDecimals);
          market.vol = utils.commaFormat(Math.round(parseInt(utils.convertToQNTf(market.hr24AssetVolume))) + '');
          market.currencyInfo = {symbol:'*'};
          market.assetInfo = {symbol:'*'};
        });
        this.$q.all(promises).then(()=>{
          this.$scope.$evalAsync(() => {
            this.markets.sort((a:any,b:any)=> {
              return this.compareMarket(a,b);
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

  /**
   * check if loaded markets match to pre loaded markets
   */
  matchToPreMarkets(markets: Array<IHeatMarket>) {
    let result = true
    if (this.preMarkets.length != markets.length) {
      result = false
    } else {
      for (let i = 0; i < markets.length; ++i) {
        let market = markets[i]
        let found = false
        for (let k = 0; k < this.preMarkets.length; ++k) {
          let pre = this.preMarkets[k]
          if (pre != null && market.asset == pre.asset && market.currency == pre.currency) {
            found = true
            if (market.lastPrice != pre.lastPrice || market.hr24Change != pre.hr24Change
              || market.hr24AssetVolume != pre.hr24AssetVolume || market.hr24CurrencyVolume != pre.hr24CurrencyVolume
              || market.hr24High != pre.hr24High || market.hr24Low != pre.hr24Low) {
              result = false
              break
            }
          }
        }
        if (!found || !result) {
          result = false
          break
        }
      }
    }
    this.preMarkets = markets
    return result
  }

  isSpecialMarket(market: IHeatMarket) {
    return market.currency == '5592059897546023466' && market.asset == '0';
  }

  /**
   * ON TOP: Markets where both assets are CERTIFIED, in alphabetical order (only one market BTC/HEAT for now)
   * BELOW THAT: Markets where one asset is certified, in alphabetical order (BTC/FIMK on top)
   * BELOW THAT: The rest of markets in alphabetical order
   */
  compareMarket(a: IHeatMarket, b: IHeatMarket): number {
    let currencyA = <AssetInfo>a['currencyInfo'];
    let assetA = <AssetInfo>a['assetInfo'];
    let currencyB = <AssetInfo>b['currencyInfo'];
    let assetB = <AssetInfo>b['assetInfo'];

    // special case btc/heat always at top.
    if (this.isSpecialMarket(a) && !this.isSpecialMarket(b)) return -1;
    if (!this.isSpecialMarket(a) && this.isSpecialMarket(b)) return 1;

    let bothCertifiedA = currencyA.certified && assetA.certified;
    let bothCertifiedB = currencyB.certified && assetB.certified;
    if (bothCertifiedA && bothCertifiedB) {
      return this.compareMarketAlphabetical(a, b);
    }
    if (bothCertifiedA != bothCertifiedB) {
      return bothCertifiedA ? -1 : 1;
    }

    let oneCertifiedA = currencyA.certified || assetA.certified;
    let oneCertifiedB = currencyB.certified || assetB.certified;
    if (oneCertifiedA && oneCertifiedB) {
      return this.compareMarketAlphabetical(a, b);
    }
    if (oneCertifiedA != oneCertifiedB) {
      return oneCertifiedA ? -1 : 1;
    }
    return this.compareMarketAlphabetical(a, b);
  }

  compareMarketAlphabetical(a: IHeatMarket, b: IHeatMarket): number {
    let currencyA = <AssetInfo>a['currencyInfo'];
    let assetA = <AssetInfo>a['assetInfo'];
    let currencyB = <AssetInfo>b['currencyInfo'];
    let assetB = <AssetInfo>b['assetInfo'];

    if (currencyA.symbol < currencyB.symbol)
      return -1;
    if (currencyA.symbol > currencyB.symbol)
      return 1;
    if (assetA.symbol < assetB.symbol)
      return -1;
    if (assetA.symbol > assetB.symbol)
      return 1;
    return 0;
  }

  public onFilterChange() {
    this.$scope.$evalAsync(() => {
      this.markets = [].concat(this.markets);
    });
  }

  toggleShowCertified() {
    this.showCertified = !this.showCertified;
    sessionStorage.setItem('trader.markets.showUncertified', this.showCertified?'false':'true');
    this.$scope.$evalAsync(() => {
      this.markets = [].concat(this.markets);
    });
  }

  // filter function used in ng-repeat
  private filterFuncImpl(market: IHeatMarket|any) {
    if (this.filter) {
      let mask = this.filter.toUpperCase();
      if (!
            (market.assetInfo.symbol.toUpperCase().indexOf(mask) >= 0 ||
             market.assetInfo.name.toUpperCase().indexOf(mask) >= 0 ||
            (market.assetInfo.description !== null && market.assetInfo.description.toUpperCase().indexOf(mask) >= 0) ||
             market.currencyInfo.symbol.toUpperCase().indexOf(mask) >= 0 ||
             market.currencyInfo.name.toUpperCase().indexOf(mask) >= 0 ||
            (market.currencyInfo.description !== null && market.currencyInfo.description.toUpperCase().indexOf(mask) >= 0))
         )
      {
        return false;
      }
    }
    if (this.showCertified && !heat.isTestnet) {
      if (market.currency != "0") {
        if (!market.currencyInfo || !market.currencyInfo.certified) {
          return false;
        }
      }
      if (market.asset != "0") {
        if (!market.assetInfo || !market.assetInfo.certified) {
          return false;
        }
      }
    }
    return true;
  }
}
