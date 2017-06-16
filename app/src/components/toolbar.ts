/// <reference path='../services/transactions/AssetIssueService.ts'/>
/// <reference path='../services/transactions/SendmoneyService.ts'/>
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
  styles: [`
  toolbar .admin-menu .md-button:not(.active) {
    background-color: #FFA726;
  }
  toolbar .admin-selected-user .md-button {
    margin-right: 18px;
    margin-left: 0px;
  }
  toolbar .test-net {
    font-size: 22px !important;
    font-weight: bold !important;
  }
  toolbar .test-net-color {
    background-color: #4CAF50 !important;
  }
  `],
  template: `
    <md-toolbar class="main-toolbar" ng-class="{'test-net-color':vm.isTestnet}">
      <div class="md-toolbar-tools">
        <h2 ng-if="vm.isTestnet" class="test-net">
          <md-tooltip md-direction="bottom">See About dialog to switch to main net</md-tooltip>
          TEST-NET
        </h2>
        <div class="wrapper">
          <div>
            <div class="user">
              <div class="small-logo">
              </div>
              <div class="user-detail" ng-if="vm.user.unlocked">
                <div class="email">
                  {{vm.user.accountName}}
                </div>
                <div class="account">
                  {{vm.user.account}}
                </div>
              </div>
            </div>
            <md-button aria-label="home" class="md-icon-button" href="#/home">
              <md-tooltip md-direction="bottom">Home</md-tooltip>
              <i><img src="assets/homeIcon.png"></i>
            </md-button>
            <md-button aria-label="send heat" class="md-icon-button" ng-click="vm.showSendmoneyDialog($event);" ng-if="vm.user.unlocked">
              <md-tooltip md-direction="bottom">Send Heat</md-tooltip>
              <i><img src="assets/sendHeatIcon.png"></i>
            </md-button>
            <md-button aria-label="explorer" class="md-icon-button" href="#/explorer">
              <md-tooltip md-direction="bottom">Blockchain explorer</md-tooltip>
              <i><img src="assets/exploreIcon.png"></i>
            </md-button>
            <md-button aria-label="messages" class="md-icon-button" href="#/messenger/0" ng-if="vm.user.unlocked">
              <md-tooltip md-direction="bottom">Messages</md-tooltip>
              <i><img src="assets/messageIcon.png"></i>
            </md-button>
            <md-button aria-label="trader" class="md-icon-button" href="{{vm.isTestnet?'#/trader/0/17964448319299609527':'#/trader/5592059897546023466/0'}}">
              <md-tooltip md-direction="bottom">Exchange</md-tooltip>
              <i><img src="assets/exchangeIcon.png"></i>
            </md-button>
            <md-button aria-label="server" class="md-icon-button" href="#/server" ng-show="vm.isNodeEnv">
              <md-tooltip md-direction="bottom">App Server</md-tooltip>
              <md-icon md-font-library="material-icons">settings_applications</md-icon>
            </md-button>
          </div>
          <div>
            <h2 ng-if="vm.user.unlocked">
              <user-balance></user-balance>
            </h2>
          </div>
        </div>
        <md-menu md-position-mode="target-right target" md-offset="34px 0px">
          <md-button aria-label="signout" class="md-icon-button" ng-click="$mdOpenMenu($event)" md-menu-origin >
            <i><img src="assets/sandwich.png"></i>
          </md-button>
          <md-menu-content width="4">
            <!--
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="copy" ng-click="vm.copy('toolbar-account-id-target', 'Acount id copied')">
                <md-icon md-font-library="material-icons">content_copy</md-icon>
                <span id="toolbar-account-id-target">{{ vm.user.account }}</span>
              </md-button>
            </md-menu-item>
            -->
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="transfer asset" ng-click="vm.showAssetTransferDialog($event)">
                <md-icon md-font-library="material-icons">swap_horiz</md-icon>
                <span id="toolbar-account-id-target">Transfer Asset</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="issue asset" ng-click="vm.showIssueAssetDialog($event)">
                <md-icon md-font-library="material-icons">library_add</md-icon>
                <span id="toolbar-account-id-target">Issue Asset</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="whitelits market" ng-click="vm.showWhitelistMarketDialog($event)">
                <md-icon md-font-library="material-icons">insert_chart</md-icon>
                <span id="toolbar-account-id-target">Create Market</span>
              </md-button>
            </md-menu-item>
            <md-menu-item ng-show="vm.isNodeEnv">
              <md-button aria-label="dev-tools" ng-click="vm.opendevTools($event)">
                <md-icon md-font-library="material-icons">developer_board</md-icon>
                Developer tools
              </md-button>
            </md-menu-item>
            <md-menu-item>
              <md-button aria-label="about" ng-click="vm.about($event)">
                <md-icon md-font-library="material-icons">info_outline</md-icon>
                About HEAT
              </md-button>
            </md-menu-item>
            <md-menu-item>
              <md-button aria-label="about" href="https://heatwallet.com/api" target="_blank">
                <md-icon md-font-library="material-icons">find_in_page</md-icon>
                Heat API (external)
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="signout" ng-click="vm.signout()">
                <md-icon md-font-library="material-icons">close</md-icon>
                Sign out
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="!vm.user.unlocked">
              <md-button aria-label="signin" href="#/login">
                <md-icon md-font-library="material-icons">lock_open</md-icon>
                Sign in
              </md-button>
            </md-menu-item>
            <md-menu-item ng-if="vm.isNodeEnv">
              <md-button aria-label="exit" ng-click="vm.exit()">
                <md-icon md-font-library="material-icons">exit_to_app</md-icon>
                Exit
              </md-button>
            </md-menu-item>
          </md-menu-content>
        </md-menu>
      </div>
    </md-toolbar>
  `
})
@Inject('$scope','$mdSidenav','user','sendmoney','electron','env','$timeout','clipboard','assetTransfer',
  'assetIssue','whitelistMarket','storage','HTTPNotify','$window')
class ToolbarComponent {

  isNodeEnv = false;
  isTestnet = heat.isTestnet;

  constructor(private $scope: angular.IScope,
              private $mdSidenav,
              public user: UserService,
              private sendmoney: SendmoneyService,
              private electron: ElectronService,
              public env: EnvService,
              $timeout: angular.ITimeoutService,
              private clipboard: ClipboardService,
              private assetTransfer: AssetTransferService,
              private assetIssue: AssetIssueService,
              private whitelistMarket: WhitelistMarketService,
              private storage: StorageService,
              private HTTPNotify: HTTPNotifyService,
              private $window: angular.IWindowService) {
    this.isNodeEnv=env.type==EnvType.NODEJS;
  }

  showSendmoneyDialog($event) {
    this.sendmoney.dialog($event).show();
  }

  showAssetTransferDialog($event) {
    this.assetTransfer.dialog($event).show();
  }

  showIssueAssetDialog($event) {
    this.assetIssue.dialog($event).show();
  }

  showWhitelistMarketDialog($event) {
    var dialog = <WhitelistMarketferDialog>this.whitelistMarket.dialog($event);
    dialog.show().then(()=> {

      /* PATCHUP IN AWAITING OF SERVER FUNCTIONALITY - also cleanup trader-markets.ts */

      var currency = dialog.fields['currency'].value;
      var asset = dialog.fields['asset'].value;
      var currencyAvailableAssets = <Array<DialogFieldAssetAssetInfo>>dialog.fields['currency']['availableAssets'];
      var assetAvailableAssets = <Array<DialogFieldAssetAssetInfo>>dialog.fields['asset']['availableAssets'];
      var currencySymbol, assetSymbol;

      for (var i=0;i<currencyAvailableAssets.length;i++) {
        var available = currencyAvailableAssets[i];
        if (available.id == currency) {
          currencySymbol = available.symbol;
          break;
        }
      }
      for (var i=0;i<assetAvailableAssets.length;i++) {
        var available = assetAvailableAssets[i];
        if (available.id == asset) {
          assetSymbol = available.symbol;
          break;
        }
      }
      var mymarkets = this.storage.namespace('trader').get('my-markets');
      if (!mymarkets) {
        mymarkets = [];
      }
      mymarkets.push({
        currency:{id: currency,symbol: currencySymbol},
        asset:{id:asset,symbol: assetSymbol}
      });
      this.storage.namespace('trader').put('my-markets', mymarkets);
      this.HTTPNotify.notify();
    });
  }

  signout() {
    this.user.lock();
  }

  exit() {
    this.$window.close();
  }

  about($event) {
    dialogs.about($event);
  }

  opendevTools() {
    this.electron.openDevTools(OpenDevToolsMode.detach);
  }

  copy(element: string, successMsg: string) {
    this.clipboard.copyWithUI(document.getElementById(element), successMsg);
  }
}
