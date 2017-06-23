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
  selector: 'explorerLatestBlocks',
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Latest Blocks
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <div class="truncate-col height-col left">Height</div>
          <div class="truncate-col block-col block left">Block</div>
          <div class="truncate-col date-col left">Time</div>
          <div class="truncate-col generator-col block left">Generator</div>
          <div class="truncate-col transactions-col">Transactions</div>
          <div class="truncate-col amount-col">Amount</div>
          <div class="truncate-col fee-col">Fee</div>
          <div class="truncate-col pos-col">POS Reward</div>
          <div class="truncate-col pop-col" flex>POP Reward</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col height-col left">{{item.height}}</div>
            <div class="truncate-col block-col block left"><a href="#/explorer-block/{{item.block}}">{{item.block}}</a></div>
            <div class="truncate-col date-col left">{{item.time}}</div>
            <div class="truncate-col generator-col block left"><a href="#/explorer-account/{{item.generator}}">{{item.generatorPublicName||item.generator}}</a></div>
            <div class="truncate-col transactions-col">{{item.numberOfTransactions}}</div>
            <div class="truncate-col amount-col">{{item.amount}}</div>
            <div class="truncate-col fee-col">{{item.fee}}</div>
            <div class="truncate-col pos-col">{{item.pos}}</div>
            <div class="truncate-col pop-col" flex>{{item.pop}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','$q','heat','latestBlocksProviderFactory','settings')
class ExplorerLatestBlocksComponent extends VirtualRepeatComponent {

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private heat: HeatService,
              private latestBlocksProviderFactory: LatestBlocksProviderFactory,
              private settings: SettingsService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.latestBlocksProviderFactory.createProvider(),
      /* decorator function */
      (block: any|IHeatBlock) => {
        var date = utils.timestampToDate(block.timestamp);
        block.time = dateFormat(date, format);
        block.amount = utils.formatQNT(block.totalAmountHQT, 8) + " HEAT";
        block.fee = utils.trimDecimals(utils.formatQNT(block.totalFeeHQT, 8),2) + " HEAT";
        block.pos = utils.trimDecimals(utils.formatQNT(block.posRewardHQT, 8),2) + " HEAT";
        block.pop = utils.trimDecimals(utils.formatQNT(block.popRewardHQT, 8),2) + " HEAT";
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    heat.subscriber.blockPopped({}, refresh, $scope);
    heat.subscriber.blockPushed({}, refresh, $scope);

    $scope.$on("$destroy",() => {
      if (this.provider) {
        this.provider.destroy();
      }
    });
  }

  onSelect(selectedBlock) {}
}
