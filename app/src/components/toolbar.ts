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
  toolbar .beta-net-color {
    background-color: #bf112f !important;
  }
  `],
  template: `
    <md-toolbar class="main-toolbar" ng-class="{'test-net-color':vm.isTestnet,'beta-net-color':vm.isBetanet}">
      <div class="md-toolbar-tools">
        <h2 ng-if="vm.isTestnet" class="test-net">
          <md-tooltip md-direction="bottom">See About dialog to switch to main net</md-tooltip>
          TEST-NET&nbsp;&nbsp;&nbsp;&nbsp;
        </h2>
        <h2 ng-if="vm.isBetanet" class="test-net">
          <md-tooltip md-direction="bottom">See About dialog to switch to main net</md-tooltip>
          B E T A N E T &nbsp;
        </h2>

        <div class="wrapper">
          <div>
            <div class="user">
              <div class="small-logo" ng-if="!vm.isBetanet"></div>
              <h2 ng-if="vm.user.unlocked">
                <div class="account-name">{{vm.user.accountName}}</div>
                <div>
                  <user-balance ng-if="vm.user.unlocked"></user-balance>
                </div>
              </h2>
            </div>
            <md-button aria-label="home" class="md-icon-button" ng-click="vm.goToHome()" ng-if="vm.user.unlocked">
              <md-tooltip md-direction="bottom">Home</md-tooltip>
              <i><img src="assets/homeIcon.png"></i>
            </md-button>
            <md-button aria-label="explorer" class="md-icon-button" href="#/explorer">
              <md-tooltip md-direction="bottom">Blockchain explorer</md-tooltip>
              <i><img src="assets/exploreIcon.png"></i>
            </md-button>
            <md-button aria-label="send heat" class="md-icon-button" ng-click="vm.showSendmoneyDialog($event);" ng-if="vm.user.unlocked">
              <md-tooltip md-direction="bottom">Send Heat</md-tooltip>
              <i><img src="assets/sendHeatIcon.png"></i>
            </md-button>
            <md-button aria-label="messages" class="md-icon-button" href="#/messenger/0" ng-if="vm.user.unlocked">
              <md-tooltip md-direction="bottom">Messages</md-tooltip>
              <i><img src="assets/messageIcon.png"></i>
            </md-button>
            <md-button aria-label="trader" class="md-icon-button" href="{{vm.isTestnet?'#/trader/2949625650944850605/0':'#/trader/5592059897546023466/0'}}">
              <md-tooltip md-direction="bottom">Exchange</md-tooltip>
              <i><img src="assets/exchangeIcon.png"></i>
            </md-button>
            <md-button aria-label="server" class="md-icon-button" href="#/server" ng-show="vm.isNodeEnv">
              <md-tooltip md-direction="bottom">App Server</md-tooltip>
              <i><img src="assets/serverIcon.png"></i>
            </md-button>
            <md-button aria-label="home" class="md-icon-button" href="#/wallet">
              <md-tooltip md-direction="bottom">Wallet</md-tooltip>
              <i><img src="assets/etherwallet.png"></i>
            </md-button>
            <div class="selected-address" ng-if="vm.user.unlocked">
              <div>Currently using <b>{{vm.user.currency.symbol}}</b></div>
              <div class="address">{{vm.user.currency.address}}</div>
            </div>
          </div>
        </div>

        <md-menu ng-if="vm.user.unlocked">
          <md-button aria-label="signout" class="md-icon-button" ng-click="$mdOpenMenu($event)" md-menu-origin >
            <md-icon md-font-library="material-icons">face</md-icon>
          </md-button>
          <md-menu-content width="4">
            <md-menu-item ng-repeat="item in vm.localHeatMasterAccounts">
              <md-button ng-click="vm.selectWalletAccount($event, item)">
                <span>{{item.identifier}}</span>
              </md-button>
            </md-menu-item>
          </md-menu>
        </md-menu>

        <md-menu md-position-mode="target-right target" md-offset="34px 0px">
          <md-button aria-label="signout" class="md-icon-button" ng-click="$mdOpenMenu($event)" md-menu-origin >
            <i><img src="assets/sandwich.png"></i>
          </md-button>
          <md-menu-content width="4">
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="transfer asset" ng-click="vm.showAssetTransferDialog($event)">
                <md-icon md-font-library="material-icons">swap_horiz</md-icon>
                <span>Transfer Asset</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="issue asset" ng-click="vm.showIssueAssetDialog($event)">
                <md-icon md-font-library="material-icons">library_add</md-icon>
                <span>Issue Asset</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="whitelits market" ng-click="vm.showWhitelistMarketDialog($event)">
                <md-icon md-font-library="material-icons">insert_chart</md-icon>
                <span>Create Market</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="lease balance" ng-click="vm.showLeaseBalanceDialog($event)">
                <md-icon md-font-library="material-icons">update</md-icon>
                <span>Lease Balance</span>
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
                <span>Heat API (external)</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="Show copy" ng-click="vm.showSecretPhrase()">
                <md-icon md-font-library="material-icons">content_copy</md-icon>
                <span>Export Key</span>
              </md-button>
            </md-menu-item>
            <md-menu-item>
              <md-button aria-label="backup" ng-click="vm.backupWallet()">
                <md-icon md-font-library="material-icons">save</md-icon>
                <span>Backup Wallet</span>
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
@Inject('$scope','$mdSidenav','user','sendmoney','electron','env','assetTransfer',
  'assetIssue','whitelistMarket','balanceLease','storage','$window','$mdToast',
  'walletFile','localKeyStore','panel','$location')
class ToolbarComponent {

  isNodeEnv = false;
  isTestnet = heat.isTestnet;
  isBetanet = heat.isBetanet

  localHeatMasterAccounts: Array<{account:string, locked:boolean, identifier:string}> = []

  constructor(private $scope: angular.IScope,
              private $mdSidenav,
              public user: UserService,
              private sendmoney: SendmoneyService,
              private electron: ElectronService,
              public env: EnvService,
              private assetTransfer: AssetTransferService,
              private assetIssue: AssetIssueService,
              private whitelistMarket: WhitelistMarketService,
              private balanceLease: BalanceLeaseService,
              private storage: StorageService,
              private $window: angular.IWindowService,
              private $mdToast: angular.material.IToastService,
              private walletFile: WalletFileService,
              private localKeyStore: LocalKeyStoreService,
              private panel: PanelService,
              private $location: angular.ILocationService) {
    this.isNodeEnv=env.type==EnvType.NODEJS;

    var refresh = utils.debounce(this.refreshLocalWallet.bind(this), 1000, false)
    this.user.on(UserService.EVENT_UNLOCKED, refresh)
    this.refreshLocalWallet()
  }

  goToHome() {

  }

  refreshLocalWallet() {
    this.localHeatMasterAccounts = []
    this.localKeyStore.list().map((account:string) => {
      let name = this.localKeyStore.keyName(account)
      this.localHeatMasterAccounts.push({
        account: account,
        locked: true,
        identifier: name || account
      })
    });
    this.localHeatMasterAccounts.forEach(acc => {
      let password = this.localKeyStore.getPasswordForAccount(acc.account)
      if (password) {
        acc.locked = false
      }
    })
  }

  unlock(secretPhrase:string) {
    this.user.unlock(secretPhrase,null).then(
      () => {
        this.$location.path(`/explorer-account/${this.user.account}/transactions`)
        heat.fullApplicationScopeReload()
      }
    )
  }

  selectWalletAccount($event, item) {
    let password = this.localKeyStore.getPasswordForAccount(item.account)
    if (password) {
      let key = this.localKeyStore.load(item.account, password);
      if (key) {
        this.unlock(key.secretPhrase)
      }
    }
    else {
      dialogs.prompt($event, 'Enter Password', 'Please enter your password to unlock', '').then(
        password => {
          let key = this.localKeyStore.load(item.account, password);
          if (key) {
            this.unlock(key.secretPhrase)
          }
        }
      )
    }
  }

  showSendmoneyDialog($event) {
    this.user.currency.invokeSendDialog($event)
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
    });
  }

  showLeaseBalanceDialog($event) {
    this.balanceLease.dialog(1440, null).show()
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

  showSecretPhrase() {
    this.panel.show(`
      <div layout="column" flex class="toolbar-copy-passphrase">
        <md-input-container flex>
          <textarea rows="2" flex ng-bind="vm.secretPhrase" readonly ng-trim="false"></textarea>
        </md-input-container>
      </div>
    `, {
      secretPhrase: this.user.secretPhrase
    })
  }

  backupWallet() {
    let exported = this.localKeyStore.export();
    let encoded = this.walletFile.encode(exported);
    var blob = new Blob([encoded], {type: "text/plain;charset=utf-8"});
    saveAs(blob, 'heat.wallet');
  }

  connectToEtherWallet($event) {
   dialogs.connectEtherWallet($event);
  }
}
