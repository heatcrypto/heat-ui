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
  selector: 'explorerResultsAccounts',
  inputs: ['query'],
  template: `
    <div layout="column" flex layout-fill>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <div class="truncate-col id-col left">Account</div>
          <div class="truncate-col balance-col">Balance</div>
          <div class="truncate-col name-col left" flex>Name</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col id-col left"><a href="#/explorer-account/{{item.id}}">{{item.id}}</a></div>
            <div class="truncate-col balance-col">{{item.balanceFormatted}}</div>
            <div class="truncate-col name-col left" flex>{{item.publicName}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','$q','searchAccountsProviderFactory')
class ExplorerResultsAccountsComponent extends VirtualRepeatComponent {
  query: string; // @input
  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private searchAccountsProviderFactory: SearchAccountsProviderFactory) {
    super($scope, $q);
    this.initializeVirtualRepeat(
      this.searchAccountsProviderFactory.createProvider(this.query),
      (account: any|IHeatAccount) => {
        account.balanceFormatted = utils.formatQNT(account.unconfirmedBalance, 8);
        if (account.publicName == account.id) {
          account.publicName = '[private]';
        }
      }
    );
    $scope.$on("$destroy",() => {
      if (this.provider) {
        this.provider.destroy();
      }
    });
  }

  onSelect(selectedAccount) {}
}
