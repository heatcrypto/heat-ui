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
  styles: [`
    left-sidenav .no-padding {
      padding-top: 0px;
      padding-bottom: 0px;
    }
  `],
  template: `
    <md-toolbar>
      <div class="md-toolbar-tools">
        <application-title></application-title>
      </div>
    </md-toolbar>
    <div layout="column" flex layout-padding>
      <md-content layout="column">
        <md-menu-item>
          <md-button href="#/home" ng-click="vm.close()">
            <md-icon md-font-library="material-icons">home</md-icon>&nbsp;HOME
          </md-button>
        </md-menu-item>
        <md-menu-item>
          <md-button ng-click="vm.showSendmoneyDialog($event); vm.close()">
            <md-icon md-font-library="material-icons">toll</md-icon>&nbsp;SEND HEAT
          </md-button>
        </md-menu-item>
        <md-menu-item>
          <md-button ng-click="vm.showSendmessageDialog($event); vm.close()">
            <md-icon md-font-library="material-icons">mail_outline</md-icon>&nbsp;SEND MESSAGE
          </md-button>
        </md-menu-item>
      </md-content>
      <md-divider></md-divider>
      <md-content layout="column" flex>
        <user-contacts flex layout="column"></user-contacts>
      </md-content>
      <div layout="column">
        <md-button class="md-primary md-raised" onclick="window.showNewsBar(event)">NEWS</md-button>
      </div>
    </div>
  `
})
@Inject('sendmoney','$mdSidenav','sendmessage','$mdMedia')
class LeftSidenavComponent {

  sidenavId: string;

  constructor(private sendmoney: SendmoneyService,
              private $mdSidenav,
              private sendmessage: SendmessageService,
              private $mdMedia) {}

  close() {
    if (!this.$mdMedia('gt-sm')) {
      this.$mdSidenav(this.sidenavId).close()
    }
  }

  showSendmoneyDialog($event) {
    this.sendmoney.dialog($event).show();
  }

  showSendmessageDialog($event) {
    this.sendmessage.dialog($event).show();
  }
}