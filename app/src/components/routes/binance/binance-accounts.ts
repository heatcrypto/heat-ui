/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
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
@RouteConfig('/binance-account/:account')
@Component({
  selector: 'binanceAccount',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Address:
            </div>
            <div class="value">
              <a href="#/binance-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} BNB
            </div>
          </div>
        </div>
      </div>

      <div flex layout="column">
        <virtual-repeat-bnb-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-bnb-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'bnbBlockExplorerService', '$interval', '$mdToast', 'settings', 'user')
class BinanceAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;
  prevIndex = 0
  busy = true

  constructor(private $scope: angular.IScope,
    private bnbBlockExplorerService: BnbBlockExplorerService,
    private $interval: angular.IIntervalService,
    private $mdToast: angular.material.IToastService,
    private settings: SettingsService,
    private user: UserService) {

    this.refresh();
    let promise = $interval(this.timerHandler.bind(this), 30000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      $interval.cancel(promise)
    })
  }

  timerHandler() {
    this.refresh()
  }


  refresh() {
    this.busy = true;
    this.balanceUnconfirmed = "";
    this.bnbBlockExplorerService.getBalance(this.account).then(balance => {
      this.$scope.$evalAsync(() => {
        this.balanceUnconfirmed = balance.toFixed(8);
        this.busy = false;
      })
    })
  }
}
