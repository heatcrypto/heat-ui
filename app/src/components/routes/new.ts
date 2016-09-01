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
    new .md-button {
      padding-top: 18px;
      padding-bottom: 18px;
      padding-left: 30px;
      padding-right: 30px;
    }
  `],
  template: `
    <div layout="column" flex layout-align="center center">
      <p class="md-title">Howdy new user</p>
      <p>To start using your new account it needs to be registered on the blockchain.</p>
      <p>Please be so kind to check the box below and click the big button and we'll make sure your account is registered and ready to use in seconds.</p>
      <form name="captchaForm">
        <p>
          <input type="hidden" ng-model="vm.captchaResponse" name="captchaResponse" required>
          <no-captcha flex g-recaptcha-response="vm.captchaResponse"
            theme="light" expired-callback="vm.captchaExpired"></no-captcha>
        </p>
        <p>
          <center>
            <md-button class="md-raised md-primary" ng-disabled="captchaForm.$invalid"
              ng-click="vm.registerAccount($event)">Create Account</md-button>
          </center>
        </p>
      </form>
    </div>
  `
})
@Inject('$scope','user','cloud','$location')
class NewComponent {

  private captchaResponse: string;
  private loading: boolean = false;
  private captchaExpired: any;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private cloud: CloudService,
              private $location: angular.ILocationService) {
    this.captchaExpired = () => {
      this.$scope.$evalAsync(() => {
        this.captchaResponse = null;
      })
    }
  }

  registerAccount() {
    var request: ICloudRegisterRequest = {
      captcha: this.captchaResponse,
      publicKey: this.user.publicKey
    };
    this.cloud.api.register(request).then(() => {
      this.$location.path('home');
    })
  }
}