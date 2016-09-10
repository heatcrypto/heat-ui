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
  selector: 'rightSidenav',
  template: `
    <md-toolbar class="md-theme-indigo">
      <h1 class="md-toolbar-tools">Settings</h1>
    </md-toolbar>
    <md-content layout-padding flex>
      <md-menu-content flex>
        <md-menu-item>
          <md-button ng-click="vm.about($event)">
            About {{ vm.applicationName }}
          </md-button>
        </md-menu-item>
        <md-menu-item>
          <md-button ng-click="vm.signout()">
            Sign out
          </md-button>
        </md-menu-item>
      </md-menu-content>
    </md-content>`
})
@Inject('user','settings','$mdDialog','$location')
class RightSidenavComponent {

  public applicationName: string;
  private applicationVersion: string;

  constructor(public user: UserService,
              public settings: SettingsService,
              public $mdDialog: angular.material.IDialogService,
              public $location: angular.ILocationService) {
    this.applicationName = settings.get(SettingsService.APPLICATION_NAME);
    this.applicationVersion = settings.get(SettingsService.APPLICATION_VERSION);
  }

  signout() {
    this.user.lock();
  }

  about($event) {
    dialogs.about($event);
  }
}
