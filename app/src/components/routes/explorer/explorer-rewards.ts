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
@RouteConfig('/explorer-rewards')
@Component({
  selector: 'explorerRewards',
  template: `
    <div layout="column" flex layout-fill layout-padding>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Forging Rewards
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <div class="truncate-col account-col left">Account</div>
          <div class="truncate-col effective-col block left">Effective Balance</div>
          <div class="truncate-col total-col left">Total Rewards</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col account-col left">
              <a href="#/explorer-account/{{item.account}}/transactions">{{item.accountName||item.account}}</a>
            </div>
            <div class="truncate-col effective-col block left">{{item.effectiveBalanceFormatted}}</div>
            <div class="truncate-col total-col left">{{item.totalRewardsFormatted}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','$q','heat','rewardsProviderFactory','settings')
class ExplorerRewardsBlocksComponent extends VirtualRepeatComponent {

  blockObject: IHeatBlock; // @input
  account: string; // @input

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private heat: HeatService,
              private rewardsProviderFactory: RewardsProviderFactory,
              private settings: SettingsService) {
    super($scope, $q);

    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.rewardsProviderFactory.createProvider(),
      /* decorator function */
      (reward: IHeatRewardsInfo) => {
        // var date = utils.timestampToDate(reward.lastBlockTimestamp);
        // reward['lastBlockDate'] = dateFormat(date, format);
        reward['effectiveBalanceFormatted'] = utils.commaFormat(reward.effectiveBalance) + " HEAT";
        reward['totalRewardsFormatted'] = utils.commaFormat(utils.formatQNT(reward.totalRewards, 8)) + " HEAT";
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    heat.subscriber.blockPopped({}, refresh, $scope);
    heat.subscriber.blockPushed({}, refresh, $scope);
  }

  onSelect(selectedBlock) {}
}
