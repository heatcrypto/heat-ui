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
          <div class="truncate-col market-col left">Market</div>

          <!-- TYPE -->
          <div class="truncate-col type-col left" flex>Type</div>

          <!-- PRICE -->
          <div class="truncate-col price-col left">Price</div>

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>

          <!-- BUYER/ SELLER -->
          <div class="truncate-col buyerseller-col left">Buyer/ Seller</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- MARKET -->
            <div class="truncate-col market-col left">{{item.market}}</div>

            <!-- TYPE -->
            <div class="truncate-col type-col left" flex>{{item.type}}</div>

            <!-- PRICE -->
            <div class="truncate-col price-col left">{{item.price}}</div>

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">{{item.amount}}</div>

            <!-- BUYER/ SELLER -->
            <div class="truncate-col buyerseller-col left">
              <a href="#/explorer-account/{{item.buyerseller}}/trades">{{item.buyersellerName}} </a>
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

@Inject('$scope', '$q', 'heat', 'explorerTradesProviderFactory', 'settings', 'assetInfo')
class VirtualRepeatTradesComponent extends VirtualRepeatComponent {

  account: string; // @input
  block: string; // @input
  personalize: boolean; // @input

  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private heat: HeatService,
    private explorerTradesProviderFactory: ExplorerTradesProviderFactory,
    private settings: SettingsService,
    private assetInfo: AssetInfoService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.explorerTradesProviderFactory.createProvider(this.account),
      /* decorator function */
      (trade: any | IHeatTrade) => {
        let date = utils.timestampToDate(trade.timestamp);
        trade.time = dateFormat(date, format);
        let currecy = this.asset(trade.currency);
        let asset = this.asset(trade.asset);
        let decimals = currecy.decimals;
        trade.market = `${currecy.symbol}/${asset.symbol}`;
        trade.type = trade.buyer === this.account? 'Buy': 'Sell';
        trade.price = (trade.price / (Math.pow(10, decimals))).toFixed(decimals);
        trade.amount = (trade.quantity / (Math.pow(10, decimals))).toFixed(decimals);
        trade.buyersellerName = trade.type === 'Buy' ? trade.sellerName : trade.buyerName;
        trade.buyerseller = trade.type === 'Buy' ? trade.seller : trade.buyer;
      });

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    if (angular.isUndefined(this.account)) {
      heat.subscriber.blockPopped({}, refresh, $scope);
      heat.subscriber.blockPushed({}, refresh, $scope);
    }
  }

  asset(asset: string) {
    if (this.assetInfo.cache[asset] && this.assetInfo.cache[asset].symbol)
      return this.assetInfo.cache[asset];
    else
      this.assetInfo.getInfo(asset);
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Trade: ' + item.askOrder);
  }

  onSelect(selectedTrade) { }
}