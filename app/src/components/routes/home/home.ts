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
@RouteConfig('/home')
@Component({
  selector: 'home',
  styles: [`
    home user-balance {
      font-weight: bold;
    }
  `],
  template: `
    <div layout="column" flex layout-padding>
      <div layout="column">
        <div layout="column" layout-gt-sm="row">
          <div layout="column">
            <user-balance class="md-display-1"></user-balance>
            <div layout="row" layout-align="start center">
              <span id="home-user-id">{{ vm.user.account }}</span>&nbsp;<copy-text element-id="home-user-id" message="Coppied Account Id"></copy-text>
            </div>
          </div>
          <div layout="row">
            <md-button ng-click="vm.showSendmoneyDialog($event); vm.close()">
              <md-icon md-font-library="material-icons">toll</md-icon>&nbsp;Send HEAT
            </md-button>
            <md-button ng-click="vm.showSendmessageDialog($event); vm.close()">
              <md-icon md-font-library="material-icons">toll</md-icon>&nbsp;Send Message
            </md-button>
          </div>
        </div>
      </div>
      <div layout="column" layout-gt-sm="row" flex>
        <div layout="column" flex>
          <p>Transactions</p>
        </div>
        <div layout="column" flex>
          <p>Messages</p>
        </div>
        <div layout="column" flex>
          <p>News</p>
          <a href="#/claim">Click to claim HEAT ICO tokens</a>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','user','cloud','sendmoney','sendmessage')
class HomeComponent {

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private cloud: CloudService,
              private sendmoney: SendmoneyService,
              private sendmessage: SendmessageService) {
  }

  showSendmoneyDialog($event) {
    this.sendmoney.dialog($event).show();
  }

  showSendmessageDialog($event) {
    this.sendmessage.dialog($event).show();
  }
}