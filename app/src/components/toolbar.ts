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
  selector: 'toolbar',
  inputs: ['@leftSidenav', '@rightSidenav'],
  styles: [`
  toolbar .admin-menu .md-button:not(.active) {
    background-color: #FFA726;
  }
  toolbar .admin-selected-user .md-button {
    margin-right: 18px;
    margin-left: 0px;
  }
  `],
  template: `
    <md-toolbar>
      <div class="md-toolbar-tools">
        <md-button class="md-icon-button" ng-click="vm.leftSidenavToggle()" ng-show="vm.user.unlocked" aria-label="Menu">
          <md-icon md-font-library="material-icons">menu</md-icon>
        </md-button>
        <application-title ng-hide="vm.user.unlocked"></application-title>
        <!--<user-balance ng-if="vm.user.unlocked && !vm.user.newAccount"></user-balance>-->
        <span flex></span>
        <!--<application-system-time></application-system-time>-->
        <md-button ng-if="vm.user.unlocked" aria-label="Sign off" ng-click="vm.user.lock()">Sign off</md-button>
        <md-button class="md-icon-button" aria-label="Open Settings" ng-click="vm.rightSidenavToggle()">
          <md-icon md-font-library="material-icons">more_vert</md-icon>
        </md-button>
      </div>
    </md-toolbar>`
})
@Inject('$scope','$mdSidenav','user','sendmoney')
class ToolbarComponent {

  constructor(private $scope: angular.IScope,
              private $mdSidenav,
              public user: UserService,
              private sendmoney: SendmoneyService) {
  }

  leftSidenav: string;
  rightSidenav: string;

  leftSidenavToggle() {
    this.$mdSidenav(this.leftSidenav).toggle();
  }

  rightSidenavToggle() {
    this.$mdSidenav(this.rightSidenav).toggle();
  }

  showSendmoneyDialog($event) {
    this.sendmoney.dialog($event).show();
  }
}