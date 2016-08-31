/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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
  styles: [`
    user-balance {
      max-width:350px;
    }
    user-balance .balance {
      white-space: nowrap;
    }
    user-balance .error .md-button {
      cursor: default;
    }
    user-balance md-progress-linear {
      height: 2px;
    }
    user-balance md-progress-linear .md-container {
      height: 2px;
    }
  `],
  template: `
    <div layout="column">
      <span class="balance" ng-show="vm.formattedBalance && !vm.showError">
        {{vm.formattedBalance}} {{vm.currencyName}}
      </span>
      <md-progress-linear md-mode="indeterminate" ng-if="vm.loading"></md-progress-linear>
      <span class="balance error" ng-show="vm.showError">
        ERROR<md-button class="md-icon-button">
          <md-tooltip md-direction="bottom">{{vm.errorDescription}}</md-tooltip>
          <md-icon md-font-library="material-icons">error</md-icon>
        </md-button>
      </span>
    </div>
  `
})
@Inject('$scope','user','engine','$q')
class UserBalanceComponent {

  private balanceHQT: string = "0";
  private formattedBalance: string = "0";
  private currencyName: string = "HEAT";
  private loading: boolean = true;
  private showError: boolean = false;
  private errorDescription: string;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private engine: EngineService,
              private $q: angular.IQService) {

    var refresh = () => { this.refresh() };

    var topic = new TransactionTopicBuilder().account(this.user.accountRS);
    var observer = engine.socket().observe<TransactionObserver>(topic).
      add(refresh).
      remove(refresh).
      confirm(refresh);

    this.refresh();
  }

  getUserBalance() : angular.IPromise<IAccountBalance> {
    return this.engine.socket().api.getAccount(this.user.accountRS);
  }

  refresh() {
    this.$scope.$evalAsync(() => {
      this.loading = true;
    });
    this.getUserBalance().then((balance) => {
      this.$scope.$evalAsync(() => {
        this.balanceHQT = balance.balanceNQT;
        this.formattedBalance = utils.commaFormat(utils.convertNQT(this.balanceHQT));
        this.showError = false;
        this.loading = false;
      });
    }, (error: ServerEngineError) => {
      this.$scope.$evalAsync(() => {
        this.showError = true;
        this.errorDescription = error.description;
        this.loading = false;
      });
    });
  }
}