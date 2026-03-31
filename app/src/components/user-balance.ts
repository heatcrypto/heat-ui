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
  selector: 'userBalance',
  template: `
    <div layout="column">
      <span>
        <md-tooltip ng-if="vm.showError" md-direction="bottom">{{vm.errorDescription}}</md-tooltip>
        <span class="balance">{{vm.formattedBalance}}</span><span class="fraction">{{vm.formattedFraction}}</span>
        <span class="currencyName">{{vm.user.currency.symbol}}</span>
        <md-icon ng-if="vm.showError" md-font-library="material-icons">error</md-icon>
      </span>
    </div>
  `
})
@Inject('$scope','user','heat','$q','$interval')
class UserBalanceComponent {

  private balance: string = "0";
  private formattedBalance: string = "0";
  private formattedFraction: string = ".00";
  private loading: boolean = true;
  private showError: boolean = false;
  private errorDescription: string;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private heat: HeatService,
              private $q: angular.IQService,
              private $interval: angular.IIntervalService) {

    /* subscribe to websocket balance changed events */
    var refresh = utils.debounce((angular.bind(this, this.refresh)), 1*1000, false);

    let unsubscribe = this.user.currency.subscribeBalanceChanged(()=>refresh())
    $scope.$on('$destroy', unsubscribe)

    this.user.on(UserService.EVENT_UNLOCKED, refresh)

    let interval = $interval(() => this.refresh(), 7*1000)

    $scope.$on('$destroy', () => {
      $interval.cancel(interval)
      this.user.removeListener(UserService.EVENT_UNLOCKED, refresh)
    })

    this.refresh();

  }

  // REFACTOR..
  refresh() {
    this.$scope.$evalAsync(() => {
      this.loading = true
    })

    let formatBalance = (balance: string) => {
      let b = new Big(balance).round(8).toString()
      let ss = b.split(".")
      if (ss.length == 1) ss.push('00')
      this.formattedBalance = ss[0]
      this.formattedFraction = "." + ss[1].padEnd(2, '0')  // 12.1 -> 12.10
      this.showError = false
    }

    let ab = wlt.aggregatedBalances[this.user.account]
    ab = ab ? ab[this.user.currency.symbol] : undefined
    if (utils.isNumber(ab)) {
      this.balance = ab
      formatBalance(ab)
    }
    //update balance for currency
    this.user.currency.getBalance().then(balance => {
      this.$scope.$evalAsync(() => {
        this.balance = balance
        if (angular.isUndefined(ab)) formatBalance(balance)
        this.loading = false
      })
    }, (error: ServerEngineError) => {
      this.$scope.$evalAsync(() => {
        if (angular.isUndefined(this.balance)) {
          formatBalance('0')
          this.showError = true
          this.errorDescription = error ? error.description : "-"
        }
        this.loading = false
      });
    })

  }
}
