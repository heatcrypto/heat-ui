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
  styles: [`
    explorer-latest-blocks .height-col {
      width: 80px;
    }
    explorer-latest-blocks .block-col {
      width: 180px;
    }
    explorer-latest-blocks .date-col {
      width: 140px;
    }
    explorer-latest-blocks .generator-col {
      width: 180px;
    }
    explorer-latest-blocks .transactions-col {
      width: 100px;
    }
    explorer-latest-blocks .amount-col {
      width: 140px;
    }
    explorer-latest-blocks .fee-col {
      width: 100px;
    }
    explorer-latest-blocks .pos-col {
      width: 100px;
    }
    explorer-latest-blocks .pop-col {
      width: 100px;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <md-list flex layout-fill layout="column">
        <md-list-item>
          <div class="header truncate-col height-col">Height</div>
          <div class="header truncate-col block-col">Block</div>
          <div class="header truncate-col date-col">Date</div>
          <div class="header truncate-col generator-col">Generator</div>
          <div class="header truncate-col transactions-col">Transactions</div>
          <div class="header truncate-col amount-col">Amount</div>
          <div class="header truncate-col fee-col">Fee</div>
          <div class="header truncate-col pos-col">POS Reward</div>
          <div class="header truncate-col pop-col" flex>POP Reward</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col height-col">{{item.height}}</div>
            <div class="truncate-col block-col"><a href="#/explore-block/{{item.block}}">{{item.block}}</a></div>
            <div class="truncate-col date-col">{{item.time}}</div>
            <div class="truncate-col generator-col"><a href="#/explore-account/{{item.generator}}">{{item.generator}}</a></div>
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