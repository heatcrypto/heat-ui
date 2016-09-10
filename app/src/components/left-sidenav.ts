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
@Component({
  selector: 'leftSidenav',
  inputs: ['@sidenavId'],
  template: `
    <md-toolbar class="md-theme-indigo">
      <h1 class="md-toolbar-tools"></h1>
    </md-toolbar>
    <md-content layout-padding flex layout="column">
      <md-menu-item>
        <md-button href="#/home" ng-click="vm.close()">
          <md-icon md-font-library="material-icons">dashboard</md-icon>&nbsp;Account
        </md-button>
      </md-menu-item>
      <md-menu-item>
        <md-button ng-click="vm.showSendmoneyDialog($event); vm.close()">
          <md-icon md-font-library="material-icons">toll</md-icon>&nbsp;Send HEAT
        </md-button>
      </md-menu-item>
      <md-menu-item>
        <md-button href="#/messenger" ng-click="vm.close()">
          <md-icon md-font-library="material-icons">mail_outline</md-icon>&nbsp;Messages
        </md-button>
      </md-menu-item>
    </md-content>`
})
@Inject('sendmoney','$mdSidenav')
class LeftSidenavComponent {

  sidenavId: string;

  constructor(private sendmoney: SendmoneyService,
              private $mdSidenav) {}

  close() {
    this.$mdSidenav(this.sidenavId).close()
  }

  showSendmoneyDialog($event) {
    this.sendmoney.dialog($event).show();
  }
}