/// <reference path='../services/transactions/AssetIssueService.ts'/>
/// <reference path='../services/transactions/SendmoneyService.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Heat Ledger Ltd.
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
    line-height: 0.6;
  }
  toolbar .test-net-color {
    //background-color: #4CAF50 !important;
    background-image: linear-gradient(180deg, #4CAF50 95%, transparent);
  }
  toolbar .beta-net-color {
    background-color: #bf112f !important;
  }
  .unread-message-mark {
    position: absolute;
    top: 22px;
    left: 32px;
    color: green;
    font-size: 35px;
  }
  .qrcodeBox {
    padding: 60px;
    margin-top: 60px;
    background: white;
    border-radius: 10px;
    width: min-content;
  }
  .qrcode-link {
    margin-left: 11px;
  }
  `],
  template: `
    <md-toolbar class="main-toolbar" ng-class="{'test-net-color':vm.isTestnet,'beta-net-color':vm.isBetanet}">
      <div class="md-toolbar-tools">
        <h3 ng-if="vm.isTestnet" class="test-net">
          <md-tooltip md-direction="bottom">See About dialog to switch to main net</md-tooltip>
          TEST-NET&nbsp;&nbsp;&nbsp;&nbsp;
          <br/><span style="font-size:9px; font-weight:normal; color:lightgrey">
          {{vm.heatServerLocation}}&nbsp;&nbsp;&nbsp;&nbsp;<br/>
          {{vm.signalingURL}}&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </h3>
        <h2 ng-if="vm.isBetanet" class="test-net">
          <md-tooltip md-direction="bottom">See About dialog to switch to main net</md-tooltip>
          B E T A N E T &nbsp;
        </h2>

        <div class="wrapper">
          <div>
            <div class="user">
              <div class="small-logo" ng-if="!vm.isBetanet" ng-click="vm.checkLogin()" ></div>
              <h2 ng-if="vm.user.unlocked">
                <div class="account-name">{{vm.user.accountName}}</div>
                <div>
                  <user-balance ng-if="vm.user.unlocked"></user-balance>
                </div>
              </h2>
            </div>

            <div ng-if="vm.user.unlocked">
              <md-button aria-label="home" class="md-icon-button" ng-click="vm.goToHome()">
                <md-tooltip md-direction="bottom">Your {{vm.user.currency.symbol}} Home</md-tooltip>
                <i><img src="assets/homeIcon.png"></i>
              </md-button>
            </div>

            <div>
              <md-button aria-label="explorer" class="md-icon-button" href="#/explorer">
                <md-tooltip md-direction="bottom">Blockchain explorer</md-tooltip>
                <i><img src="assets/exploreIcon.png"></i>
              </md-button>
              <md-button aria-label="trader" class="md-icon-button" ng-click="vm.goToExchange()">
                <md-tooltip md-direction="bottom">Exchange</md-tooltip>
                <i><img src="assets/exchangeIcon.png"></i>
              </md-button>
              <md-button aria-label="server" class="md-icon-button" href="#/server" ng-show="vm.env.isElectron">
                <md-tooltip md-direction="bottom">App Server</md-tooltip>
                <i><img src="assets/serverIcon.png"></i>
              </md-button>
              <md-button aria-label="peers" class="md-icon-button" href="#/peers">
                <md-tooltip md-direction="bottom">Peers</md-tooltip>
                <i><img style="filter: invert(1);height: 28px;" src="assets/network_node.svg"></i>
              </md-button>
              <md-button aria-label="home" class="md-icon-button" href="#/wallet" ng-if="!vm.user.unlocked">
                <md-tooltip md-direction="bottom">Wallet</md-tooltip>
                <i><img src="assets/walletIcon.png"></i>
              </md-button>

              <!--
              <md-button aria-label="home" class="md-icon-button" ng-click="vm.$mdToast.show(vm.$mdToast.simple().textContent('Incorrect Password (or Pin)').hideDelay(15000))">
                <i><img src="assets/walletIcon.png"></i>
              </md-button>
              -->


            </div>

            <div hide show-gt-sm ng-if="vm.user.unlocked">
              <md-button aria-label="send heat" class="md-icon-button" ng-click="vm.showSendmoneyDialog($event);">
                <md-tooltip md-direction="bottom">Send {{vm.user.currency.symbol}}</md-tooltip>
                <i><img src="assets/sendHeatIcon.png"></i>
              </md-button>
              <md-button aria-label="messages" class="md-icon-button" ng-click="vm.goToMessenger()">
                <md-tooltip md-direction="bottom">Messages</md-tooltip>
                <i>
                  <img src="assets/messageIcon.png">
                </i>
                <div class="unread-message-mark" ng-if="vm.hasUnreadP2PMessage">*</div>
              </md-button>
              <md-button aria-label="home" class="md-icon-button" href="#/wallet">
                <md-tooltip md-direction="bottom">Wallet</md-tooltip>
                <i><img src="assets/walletIcon.png"></i>
              </md-button>
            </div>

            <md-menu md-position-mode="target-right target" md-offset="34px 34px" hide-gt-sm ng-if="vm.user.unlocked">
              <md-button aria-label="user menu" class="md-icon-button" ng-click="$mdMenu.open($event)" md-menu-origin >
                <md-icon md-font-library="material-icons">more_vert</md-icon>
              </md-button>
              <md-menu-content width="4">
                <md-menu-item ng-if="vm.user.unlocked">
                  <md-button aria-label="home" ng-click="vm.goToHome()">
                    <md-icon md-font-library="material-icons">home</md-icon>
                    Your {{vm.user.currency.symbol}} Home
                  </md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button aria-label="explorer" href="#/explorer">
                    <md-icon md-font-library="material-icons">explore</md-icon>
                    Blockchain explorer
                  </md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button aria-label="trader" ng-click="vm.goToExchange()">
                    <md-icon md-font-library="material-icons">bar_chart</md-icon>
                    Exchange
                  </md-button>
                </md-menu-item>
                <md-menu-item ng-show="vm.env.isNodeEnv">
                  <md-button aria-label="server" href="#/server">
                    <md-icon md-font-library="material-icons">settings</md-icon>
                    App Server
                  </md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button aria-label="wallet" href="#/wallet">
                    <md-icon md-font-library="material-icons">account_balance_wallet</md-icon>
                    Wallet
                  </md-button>
                </md-menu-item>
                <md-menu-item ng-if="vm.user.unlocked">
                  <md-button aria-label="send heat" ng-click="vm.showSendmoneyDialog($event);">
                    <md-icon md-font-library="material-icons">send</md-icon>
                    Send {{vm.user.currency.symbol}}
                  </md-button>
                </md-menu-item>
                <md-menu-item ng-if="vm.user.unlocked">
                  <md-button aria-label="messages" ng-click="vm.goToMessenger()">
                    <md-icon md-font-library="material-icons">chat</md-icon>
                    Messages
                  </md-button>
                </md-menu-item>
                <!--
                <md-menu-item>
                  <md-button aria-label="home" ng-click="vm.openTestPage()">
                    <md-icon md-font-library="material-icons">check</md-icon>
                  </md-button>
                </md-menu-item>
                -->
              </md-menu-content>
            </md-menu>

            <span flex></span>

            <div class="selected-address" ng-if="vm.user.unlocked">
              <div>Currently using <b>{{vm.user.currency.symbol}}</b>
                <a ng-click="vm.showQRCode(vm.user.currency.address)" class="qrcode-link">
                  <md-tooltip>Show QR code</md-tooltip>
                  <md-icon md-font-library="material-icons">qr_code</md-icon>
                </a>
              </div>
              <div layout="row">
                <div class="address wrapped">
                  <a ng-click="vm.copyAddress()" id="toolbar-user-address">{{vm.user.currency.address}}
                    <md-tooltip>Copy to clipboard</md-tooltip>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <md-menu ng-if="vm.user.unlocked" style="margin-right: -12px;">
          <md-button aria-label="signout" class="md-icon-button" ng-click="$mdMenu.open($event)" md-menu-origin >
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
          <md-button aria-label="signout" class="md-icon-button" ng-click="$mdMenu.open($event)" md-menu-origin >
            <i><img src="assets/sandwich.png"></i>
          </md-button>
          <md-menu-content width="4">
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="transfer asset" ng-click="vm.showAssetTransferDialog($event)">
                  <md-icon md-font-library="material-icons">swap_horiz</md-icon>
                  <span>Transfer Asset</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="issue asset" ng-click="vm.showIssueAssetDialog($event)">
                  <md-icon md-font-library="material-icons">library_add</md-icon>
                  <span>Issue Asset</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="assign fees to private asset" ng-click="vm.showAssetAssignAccountDialog($event)">
                  <md-icon md-font-library="material-icons">sports_baseball</md-icon>
                  <span>Fees for private asset</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="assign expiration timestamp to asset" ng-click="vm.showAssetExpirationDialog($event)">
                  <md-icon md-font-library="material-icons">av_timer</md-icon>
                  <span>Assign expiration to asset</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="whitelist account for private asset" ng-click="vm.showWhitelistAssetAccountDialog($event)">
                  <md-icon md-font-library="material-icons">how_to_reg</md-icon>
                  <span>Whitelist account for private asset</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="set supervisory account" ng-click="vm.showSupervisoryAccountDialog($event)">
                  <md-icon md-font-library="material-icons">supervisor_account</md-icon>
                  <span>Set supervisory account</span>
                </md-button>
              </md-menu-item>
              <md-menu-item ng-if="vm.user.unlocked">
                <md-button aria-label="set max asset amount per interval that account can to send" ng-click="vm.showAccountAssetLimitDialog($event)">
                  <md-icon md-font-library="material-icons">vertical_align_center</md-icon>
                  <!--<md-icon md-font-library="material-icons">horizontal_distribute</md-icon>-->
                  <span>Set asset amount limit</span>
                </md-button>
              </md-menu-item>

            <md-menu-divider ng-if="vm.user.unlocked"></md-menu-divider>

            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="whitelits market" ng-click="vm.showWhitelistMarketDialog($event)">
                <md-icon md-font-library="material-icons">insert_chart</md-icon>
                <span>Create/Update Market</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="lease balance" ng-click="vm.showLeaseBalanceDialog($event)">
                <md-icon md-font-library="material-icons">update</md-icon>
                <span>Lease Balance</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="register internet address" ng-click="vm.registerInternetAddress($event)">
                <md-icon md-font-library="material-icons">spellcheck</md-icon>
                <span>Register Masternode Address</span>
              </md-button>
            </md-menu-item>

            <md-menu-divider ng-if="vm.user.unlocked"></md-menu-divider>

            <md-menu-item>
              <md-button aria-label="about" ng-click="vm.about($event)">
                <md-icon md-font-library="material-icons">info_outline</md-icon>
                About HEAT
              </md-button>
              <div style="font-size:9px; font-weight:normal; color:lightslategray">
                API provider:<br/>
                {{vm.heatServerLocation}}<br/>
              </div>
            </md-menu-item>
            <md-menu-item>
              <md-button aria-label="about" href="https://heatwallet.com/api" target="_blank" rel="noopener noreferrer">
                <md-icon md-font-library="material-icons">find_in_page</md-icon>
                <span>Heat API (external)</span>
              </md-button>
            </md-menu-item>
            <md-menu-item  ng-if="vm.user.unlocked">
              <md-button aria-label="Show private key (or secret phrase)" ng-click="vm.showSecretPhrase()">
                <md-icon md-font-library="material-icons">content_copy</md-icon>
                <span>Show private key</span>
              </md-button>
            </md-menu-item>
            <!--<md-menu-item>
              <md-button aria-label="backup" ng-click="vm.backupWallet()">
                <md-icon md-font-library="material-icons">save</md-icon>
                <span>Backup Wallet</span>
              </md-button>
            </md-menu-item>-->
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
            <md-menu-item ng-if="vm.env.isNodeEnv">
              <md-button aria-label="exit" ng-click="vm.exit()">
                <md-icon md-font-library="material-icons">exit_to_app</md-icon>
                Exit
              </md-button>
            </md-menu-item>
            <md-menu-item ng-show="vm.env.isElectron" style="color: grey; height: 22px; min-height: 22px;">
                <div>Press Ctrl-Shift-I to open Developer Tools</div>
            </md-menu-item>
          </md-menu-content>
        </md-menu>
      </div>
    </md-toolbar>
  `
})
@Inject('$rootScope', '$scope', '$mdSidenav', 'user', 'sendmoney', 'electron', 'env', 'assetTransfer',
  'assetIssue','whitelistAssetAccount', 'assetAssignFees', 'whitelistMarket', 'assetExpiration', 'supervisoryAccount',
  'accountAssetLimit', 'balanceLease', 'masternode', 'storage', '$window', '$mdToast',
  'walletFile', 'localKeyStore', 'panel', '$location', 'clipboard', 'P2PMessaging', 'settings')
class ToolbarComponent {

  isTestnet = heat.isTestnet;
  isBetanet = heat.isBetanet;
  heatServerLocation;
  signalingURL;
  hasUnreadP2PMessage = false;

  constructor(private $rootScope: angular.IScope,
              private $scope: angular.IScope,
              private $mdSidenav,
              public user: UserService,
              private sendmoney: SendmoneyService,
              private electron: ElectronService,
              public env: EnvService,
              private assetTransfer: AssetTransferService,
              private assetIssue: AssetIssueService,
              private whitelistAssetAccountService: WhitelistAssetAccountService,
              private assetAssignFees: AssetAssignFeesService,
              private whitelistMarket: WhitelistMarketService,
              private assetExpiration: AssetExpirationService,
              private supervisoryAccount: SupervisoryAccountService,
              private accountAssetLimit: AccountAssetLimitService,
              private balanceLease: BalanceLeaseService,
              private masternodeService: MasternodeService,
              private storage: StorageService,
              private $window: angular.IWindowService,
              private $mdToast: angular.material.IToastService,
              private walletFile: WalletFileService,
              private localKeyStore: LocalKeyStoreService,
              private panel: PanelService,
              private $location: angular.ILocationService,
              private clipboard: ClipboardService,
              private p2pMessaging: P2PMessaging,
              private settings: SettingsService) {

    var refresh = utils.debounce(this.refreshLocalWallet.bind(this), 1000, false)
    this.user.on(UserService.EVENT_UNLOCKED, refresh)
    this.refreshLocalWallet()

    $rootScope.$on('HEAT_SERVER_LOCATION', (event, nothing) => {
      let port = settings.get(SettingsService.HEAT_PORT)
      this.heatServerLocation = settings.get(SettingsService.HEAT_HOST) + (port ? ':' + port : '')
      this.signalingURL = this.settings.get(SettingsService.HEAT_MESSAGING).websocket
    })

    let unreadStatusChangedListener = (n => {
      this.$scope.$evalAsync(() => {
        this.hasUnreadP2PMessage = n > 0
      })
    })
    this.p2pMessaging.on(P2PMessaging.EVENT_UNREAD_STATUS_CHANGED, unreadStatusChangedListener);
    $scope.$on('$destroy', () => this.p2pMessaging.removeListener(P2PMessaging.EVENT_UNREAD_STATUS_CHANGED, unreadStatusChangedListener));
  }

  localHeatMasterAccounts: Array<{ account: string, locked: boolean, identifier: string }> = []

  copyAddress() {
    this.clipboard.copyWithUI(document.getElementById('toolbar-user-address'), 'Copied address to clipboard');
  }

  goToHome() {
    this.$location.path(this.user.currency.homePath)
  }

  checkLogin() {
    if (this.user.unlocked) {
      this.goToHome()
    } else {
      this.$location.path('login')
    }
  }

  goToExchange() {
    if (this.user.currency && this.user.currency.symbol === 'ARDR') {
      this.$location.path('/ardor-trader/15307894944226771409/ardor')
    } else {
      this.isTestnet ? this.$location.path('/trader/2949625650944850605/0') : this.$location.path('/trader/5592059897546023466/0')
    }
  }

  goToMessenger() {
    this.$location.path('/messenger/0')
  }

  openTestPage() {
    let address = '0x98d84343b9b98bb15a2ba3d6867c42a89c37a067'// '0x0102768bf0f0901689357262401b031e83900b4c'
    let ethplorer: EthplorerService = heat.$inject.get('ethplorer')
    ethplorer.getAddressInfo(address).then(() => {
      this.$location.path('ethereum-account/' + address)
    })
  }

  refreshLocalWallet() {
    this.localHeatMasterAccounts = [];
    this.localKeyStore.list().then(walletEntries => {
      walletEntries.map(entry => {
        this.localHeatMasterAccounts.push({
          account: entry.account,
          locked: true,
          identifier: entry.name || entry.account
        })
      });
      this.localHeatMasterAccounts.forEach(acc => {
        let password = this.localKeyStore.getPasswordForAccount(acc.account)
        if (password) {
          acc.locked = false
        }
      })
    })
  }

  unlock(secretPhrase: string) {
    this.user.unlock(secretPhrase, null).then(
      () => {
        let currentPath = this.$location.path();
        if (currentPath.indexOf("/explorer-account/") > -1) {
          this.$location.path(`/explorer-account/${this.user.account}/transactions`);
        } else {
          heat.fullApplicationScopeReload();
        }
      }
    )
  }

  selectWalletAccount($event, item) {
    let f = (account, password) => {
      return this.localKeyStore.load(account, password).then(key => {
        if (key) {
          this.unlock(key.secretPhrase)
        }
      })
    }
    let password = this.localKeyStore.getPasswordForAccount(item.account)
    if (password) {
      f(item.account, password).catch(e => console.log(e))
    } else {
      dialogs.prompt($event, 'Enter Password (or Pin)', 'Please enter your Password (or Pin) to unlock', '').then(
          password => {
            f(item.account, password).catch(e => {
              this.$mdToast.show(this.$mdToast.simple().textContent("Incorrect Password (or Pin)").hideDelay(5000))
            })
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
    dialog.show().then(() => {

      /* PATCHUP IN AWAITING OF SERVER FUNCTIONALITY - also cleanup trader-markets.ts */

      var currency = dialog.fields['currency'].value;
      var asset = dialog.fields['asset'].value;
      var currencyAvailableAssets = <Array<DialogFieldAssetAssetInfo>>dialog.fields['currency']['availableAssets'];
      var assetAvailableAssets = <Array<DialogFieldAssetAssetInfo>>dialog.fields['asset']['availableAssets'];
      var currencySymbol, assetSymbol;

      for (var i = 0; i < currencyAvailableAssets.length; i++) {
        var available = currencyAvailableAssets[i];
        if (available.id == currency) {
          currencySymbol = available.symbol;
          break;
        }
      }
      for (var i = 0; i < assetAvailableAssets.length; i++) {
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
        currency: { id: currency, symbol: currencySymbol },
        asset: { id: asset, symbol: assetSymbol }
      });
      this.storage.namespace('trader').put('my-markets', mymarkets);
    });
  }

  showLeaseBalanceDialog($event) {
    this.balanceLease.dialog(1440, null).show();
  }

  registerInternetAddress($event) {
    this.masternodeService.dialog(null).show();
  }

  showWhitelistAssetAccountDialog($event) {
    this.whitelistAssetAccountService.dialog($event).show();
  }

  showAssetAssignAccountDialog($event) {
    this.assetAssignFees.dialog($event).show();
  }

  showAssetExpirationDialog($event) {
    this.assetExpiration.dialog($event).show();
  }

  showSupervisoryAccountDialog($event) {
    this.supervisoryAccount.dialog($event).show();
  }

  showAccountAssetLimitDialog($event) {
    this.accountAssetLimit.dialog($event).show();
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

  /*backupWallet() {
    let exported = this.localKeyStore.export();
    let encoded = this.walletFile.encode(exported);
    var blob = new Blob([encoded], { type: "text/plain;charset=utf-8" });
    saveAs(blob, 'heat.wallet');
  }*/

  showQRCode(data) {
    this.clipboard.showQRCode(data)
  }

  showSecretPhrase() {
    this.clipboard.showSecret(this.user.currency.secretPhrase, this.user.currency.symbol)
  }

}
