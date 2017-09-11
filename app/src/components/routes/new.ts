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
@RouteConfig('/new')
@Component({
  selector: 'new',
  styles: [`
    new h2 {
      font-size: 26px !important;
    }
    new .outer-container {
      width: 100%;
      max-width: 380px;
    }
  `],
  template: `
    <div layout="column" flex layout-align="start center">
      <div layout="column" layout-padding class="outer-container">
        <div layout="column" flex layout-align="start center">
          <h2>Howdy new user</h2>
          <p>Click on the home button in the toolbar to go to your new account, you have yet to receive your first payment so payments are empty.</p>
        </div>
        <div layout="column" flex layout-align="start center" ng-show="!vm.activated">
          <p>Your account gets activated (and messages become visible) once your account is registered on the blockchain,
  this will happen in the next block which is to be expected in the next 30 seconds.</p>
          <md-progress-circular md-mode="indeterminate"></md-progress-circular>
          <p><b>Registering account on blockchain, please wait</b></p>
        </div>
        <div layout="column" layout-align="space-around" ng-show="vm.activated">
          <p><b>Your account is activated.</b></p>
          <p>Check out your messages by clicking the messages button in the toolbar, there might be a message for you.</p>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','$q','heat','user','$timeout')
class NewComponent {

  activated = false;

  constructor(private $scope: angular.IScope,
              private $q: angular.IQService,
              private heat: HeatService,
              private user: UserService,
              private $timeout: angular.ITimeoutService) {
     this.checkAgain();
  }

  isExistingAccount(): angular.IPromise<boolean> {
    let deferred = this.$q.defer<boolean>();
    this.heat.api.getAccountBalance(this.user.account, "0").then(() => {
      deferred.resolve(true);
    }).catch((error: ServerEngineError) => {
      deferred.resolve(false);
    });
    return deferred.promise;
  }

  checkAgain() {
    this.isExistingAccount().then((activated)=>{
      if (activated) {
        this.$scope.$evalAsync(()=>{
          this.activated = true;
        })
      }
      else {
        this.$timeout(2000,false).then(()=>{
          this.checkAgain();
        });
      }
    })
  }
}