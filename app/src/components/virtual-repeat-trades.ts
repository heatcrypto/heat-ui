///<reference path='VirtualRepeatComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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
  selector: 'virtualRepeatTrades',
  inputs: ['account', 'block', 'personalize', 'hideLabel'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- MARKET -->
          <div class="truncate-col id-col left">Market</div>

          <!-- TYPE -->
          <div class="truncate-col info-col left" flex>Type</div>

          <!-- PRICE -->
          <div class="he truncate-col height-col left">Price</div>

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>

          <!-- BUYER -->
          <div class="truncate-col inoutgoing-col left">Buyer</div>

          <!-- SELLER -->
          <div class="truncate-col inoutgoing-col left">Seller</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- MARKET -->
            <div class="truncate-col id-col left">{{item.market}}</div>

            <!-- TYPE -->
            <div class="truncate-col info-col left" flex>{{item.type}}</div>

            <!-- PRICE -->
            <div class="he truncate-col height-col left">{{item.price}}</div>

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">{{item.amount}}</div>

            <!-- BUYER -->
            <div class="truncate-col inoutgoing-col left">
             {{item.buyerName}}
            </div>

            <!-- SELLER -->
            <div class="truncate-col inoutgoing-col left">
              {{item.sellerName}}
            </div>

            <!-- JSON -->
            <div class="truncate-col json-col">
              <a ng-click="vm.jsonDetails($event, item)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>

          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope', '$q', 'heat', 'explorerTradesProviderFactory', 'settings')
class VirtualRepeatTradesComponent extends VirtualRepeatComponent {

  account: string; // @input
  block: string; // @input
  personalize: boolean; // @input
  tradesRenderer: TradesRenderer = new TradesRenderer();
  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private heat: HeatService,
    private explorerTradesProviderFactory: ExplorerTradesProviderFactory,
    private settings: SettingsService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.explorerTradesProviderFactory.createProvider(this.account),
      /* decorator function */
      (trade: any | IHeatTrade) => {
        let date = utils.timestampToDate(trade.timestamp);
        trade.time = dateFormat(date, format);
        trade.heightDisplay = trade.height == 2147483647 ? '*' : trade.height;
        let currecy = this.tradesRenderer.asset(trade.currency);
        let asset = this.tradesRenderer.asset(trade.asset);
        let decimals = currecy.decimals;
        trade.market = `${currecy.symbol}/${asset.symbol}`;
        trade.type = trade.isbuy ? 'Buy' : 'Sell';
        trade.price = (trade.price / (Math.pow(10, decimals))).toFixed(decimals);
        trade.amount = (trade.quantity / (Math.pow(10, decimals))).toFixed(decimals);
      });

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    if (angular.isUndefined(this.account)) {
      heat.subscriber.blockPopped({}, refresh, $scope);
      heat.subscriber.blockPushed({}, refresh, $scope);
    }
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Trade: ' + item.askOrder);
  }

  onSelect(selectedTrade) { }
}

class TradesRenderer {
  private assetInfo: AssetInfoService;
  private $q: angular.IQService;
  private heat: HeatService;

  constructor() {
    this.heat = <HeatService>heat.$inject.get('heat');
    this.assetInfo = <AssetInfoService>heat.$inject.get('assetInfo');
    this.$q = <angular.IQService>heat.$inject.get('$q');
  }

  // renderAsset() {
  //   if (angular.isDefined(this.assetInfo.cache[currency])) {
  //     let symbol = this.assetInfo.cache[currency].symbol;
  //     if (angular.isString(symbol)) {
  //       return this.formatAmount(amount, symbol, neg);
  //     }
  //   }
  //   let deferred = this.$q.defer<string>();
  //   this.assetInfo.getInfo(currency).then(info => {
  //     deferred.resolve(this.formatAmount(amount, info.symbol, neg))
  //   }, deferred.reject);
  //   return deferred.promise;
  // }

  formatAmount(amount: string, neg: boolean): string {
    let returns = this.amount(amount, 8);
    return (neg ? '-' : '+') + returns;
  }

  amount(amountHQT: string, decimals: number) {
    return `${utils.formatQNT(amountHQT || "0", decimals)}`;
  }

  asset(asset: string) {
    if (this.assetInfo.cache[asset] && this.assetInfo.cache[asset].symbol)
      return this.assetInfo.cache[asset];
    else
      this.assetInfo.getInfo(asset);
  }
}