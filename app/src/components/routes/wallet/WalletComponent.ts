/*
 * The MIT License (MIT)
 * Copyright (c) 2016-2021 HEAT DEX.
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

///<reference path="./WalletComponentAbstract.ts" />

@RouteConfig('/wallet')
@Component({
  selector: 'wallet',
  style: `
    .bip44-label {
      font-size: smaller;
      color: deepskyblue;
    }
    .selected-currency {
      padding: 2px;
      margin-left: 2px;
      font-size: smaller;
      color: darkcyan;
      border: solid 1px darkcyan;
      border-radius: 6px;
    }
  `,
  template: `
   <!--  layout-align="start center" -->
    <div layout="column"  flex layout-padding>
      <div layout="row">

        <!-- Open File input is hidden -->
        <md-button class="md-primary md-raised">
          <md-tooltip md-direction="bottom">Open wallet file, adds all contents</md-tooltip>
          <label for="walet-input-file">
            Import File
          </label>
        </md-button>
        
        <input type="file" onchange="angular.element(this).scope().vm.pageAddFileInputChange(this.files); angular.element(this).val(null)" class="ng-hide" id="walet-input-file">

        <!-- Adds a wallet seed (heat secret phrase or bip44 eth/btc seed) -->
        <md-button class="md-primary md-raised" ng-click="vm.importSeed()" aria-label="Import Seed">
          <md-tooltip md-direction="bottom">Import Seed</md-tooltip>
          Import Seed/Private Key
        </md-button>

        <!-- Export Wallet to File -->
        <md-button class="md-warn md-raised" ng-click="vm.exportWallet()" aria-label="Export Wallet" ng-if="!vm.allLocked">
          <md-tooltip md-direction="bottom">Export Wallet File</md-tooltip>
          Export Wallet File
        </md-button>

        <md-select class="wallet-dropdown md-warn md-raised" placeholder="Create Address" ng-change="vm.createAccount($event)" ng-model="vm.selectedChain">
          <md-option style="height: 30px;"ng-repeat="entry in vm.chains" value="{{entry.name}}" ng-disabled="{{entry.disabled}}">{{entry.name}}</md-option>
        </md-select>
        
        <md-checkbox ng-model="vm.displayUnlocked" style="margin: 8px 26px 0 auto;">
          Display unlocked only
        </md-checkbox>
        
        <md-button ng-click="vm.unlock($event)" class="md-primary md-raised" aria-label="Unlock account">
          Unlock
        </md-button>
      </div>

      <wallet-search layout="column" wallet-component="vm" query="''" query-tokens=""></wallet-search>

      <div layout="column" layout-fill  flex>
        <div layout-fill layout="column" class="wallet-entries" flex>

          <!-- Build a wallet structure that contains ::
                - wallet entries
                - per entry currency balances
                - per currency token balances  -->

          <md-list layout-fill layout="column" flex>
            <md-list-item ng-repeat="entry in vm.entries" ng-if="entry.displayed()" ng-hide="entry.isWalletEntry && !entry.unlocked && vm.displayUnlocked">

              <!-- Wallet entry -->
              <div ng-if="entry.isWalletEntry" layout="row" class="wallet-entry" flex>
                <!--
                <md-checkbox ng-model="entry.selected">
                  <md-tooltip md-direction="bottom">
                    Check this to include in wallet export
                  </md-tooltip>
                </md-checkbox>
                -->
                <md-button class="md-icon-button left" ng-click="entry.toggle()">
                  <md-icon md-font-library="material-icons">{{entry.expanded?'expand_less':'expand_more'}}</md-icon>
                </md-button>

                <div flex ng-if="entry.secretPhrase" class="identifier">
                  <a ng-click="entry.toggle()">{{entry.identifier}}</a>
                  <span ng-if="entry.bip44Compatible" class="bip44-label">BIP44</span>
                  <span ng-repeat="sym in entry.selectedCurrencies" class="selected-currency">{{sym}}</span>
                  <span class="visibleLabel">{{entry.visibleLabel}}</span>
                  <span class="label">{{entry.label}}</span>
                </div>
                <div flex ng-if="!entry.secretPhrase" class="identifier">
                  <span>{{entry.identifier}}</span>
                  <span ng-if="entry.bip44Compatible" class="bip44-label">BIP44</span>
                  <span ng-repeat="sym in entry.selectedCurrencies" class="selected-currency">{{sym}}</span>
                  <span class="visibleLabel">{{entry.visibleLabel}}</span>
                </div>

                <md-menu md-position-mode="target-right target" md-offset="34px 34px" ng-if="entry.unlocked">
                  <md-button aria-label="user menu" class="md-icon-button right" ng-click="$mdMenu.open($event)" md-menu-origin >
                    <md-icon md-font-library="material-icons">more_horiz</md-icon>
                  </md-button>
                  <md-menu-content width="4">
                    <!--<span>Account {{entry.account}}</span>-->
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.enterWalletEntryLabel(entry)">
                        <md-icon md-font-library="material-icons">label</md-icon>
                        Enter label
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.showSecret(entry.secretPhrase, entry.symbol)">
                        <md-icon md-font-library="material-icons">file_copy</md-icon>
                        Show private key
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.changePincode($event, entry)">
                        <md-icon md-font-library="material-icons">vpn_key</md-icon>
                        Change pin code
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.remove($event, entry)">
                        <md-icon md-font-library="material-icons">delete_forever</md-icon>
                        Remove account
                      </md-button>
                    </md-menu-item>
                    
                    <md-menu-divider></md-menu-divider>

                    <md-menu-item>
                      <md-menu>
                          <md-button ng-click="$mdMenu.open()" style="text-transform: none;">
                            <md-icon md-font-library="material-icons" style="margin-right: 16px;">restore</md-icon>
                            Restore addresses
                          </md-button>
                          <md-menu-content>
                            <md-menu-item>
                              <md-button ng-click="vm.restoreAddresses(entry, 'Bitcoin')">BTC</md-button>
                            </md-menu-item>
                            <md-menu-item>
                              <md-button ng-click="vm.restoreAddresses(entry, 'Ethereum')">ETH</md-button>
                            </md-menu-item>
                            <md-menu-item>
                              <md-button ng-click="vm.restoreAddresses(entry, 'Litecoin')">LTC</md-button>
                            </md-menu-item>
                            <md-menu-item>
                              <md-button ng-click="vm.restoreAddresses(entry, 'BitcoinCash')">BCH</md-button>
                            </md-menu-item>
                          </md-menu-content>
                      </md-menu>
                    </md-menu-item>
                    
                  </md-menu-content>
                </md-menu>
              </div>

              <!-- Currency Balance -->
              <div ng-if="entry.isCurrencyBalance" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}} <span ng-if="entry.index!=undefined">#{{entry.index}}</span></div>&nbsp;
                <div class="identifier" flex><a ng-click="entry.unlock()">{{entry.address}}</a></div>&nbsp;
                <span class="visibleLabel flex" style="margin-top: 8px;">{{entry.visibleLabel}}</span>
                <div class="balance" ng-class="{'empty':entry.isZeroBalance()}">
                  <span class="state-message" ng-if="entry.stateMessage">{{entry.stateMessage}}</span>
                  <span>{{entry.balance}}</span>
                  <span ng-if="entry.hasDigit()">&nbsp;&nbsp;&nbsp;{{entry.symbol}}</span>
                </div>
                <md-menu md-position-mode="target-right target" md-offset="34px 34px">
                  <md-button aria-label="user menu" class="md-icon-button right" ng-click="$mdMenu.open($event)" md-menu-origin >
                    <md-icon md-font-library="material-icons">more_horiz</md-icon>
                  </md-button>
                  <md-menu-content width="4">
                    <md-menu-item style="height: 26px; min-height: 26px">
                      <span style="text-align: center">{{entry.name}}  address: {{entry.address}}</span>
                    </md-menu-item>
                    <md-menu-item ng-if="entry.pubKey">
                      <span style="font-size: x-small">Public key:<br>{{entry.pubKey}}</span>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.showSecret(entry.secretPhrase, entry.symbol)">
                        <md-icon md-font-library="material-icons">file_copy</md-icon>
                        Show private key
                      </md-button>
                    </md-menu-item>
                    <md-menu-item ng-if="entry.symbol==='BTC'">
                      <md-button aria-label="explorer" ng-click="vm.signBitcoinMessage($event, entry)">
                        <md-icon md-font-library="material-icons">spellcheck</md-icon>
                        Sign Bitcoin Message
                      </md-button>
                    </md-menu-item>
                    <md-menu-item ng-if="entry.symbol==='ETH'">
                      <md-button aria-label="explorer" ng-click="vm.signEthereumMessage($event, entry)">
                        <md-icon md-font-library="material-icons">spellcheck</md-icon>
                        Sign Ethereum Message
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.enterCurrencyBalanceLabel(entry)">
                        <md-icon md-font-library="material-icons">label</md-icon>
                        Enter label
                      </md-button>
                    </md-menu-item>
                    <md-menu-item ng-hide="entry.symbol==='HEAT'" ng-if="entry.index!=undefined">
                      <md-button aria-label="explorer" ng-click="vm.createAddress(entry.walletEntry, entry.name)">
                        <md-icon md-font-library="material-icons">add</md-icon>
                        Create {{entry.symbol}} address
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-hide="entry.symbol==='HEAT'" ng-click="vm.deleteAddressEntry(entry)">
                        <md-icon md-font-library="material-icons">delete_forever</md-icon>
                        Remove address  <span class="name">{{entry.name}} <span ng-if="entry.index!=undefined">#{{entry.index}}</span></span>
                      </md-button>
                    </md-menu-item>
                  </md-menu-content>
                </md-menu>
              </div>

              <!-- Currency Address Loading -->
              <div ng-if="entry.isCurrencyAddressLoading" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <div class="identifier" flex>{{entry.address || ''}}  loading ..</div>
              </div>

              <!-- Currency Address Create -->
              <div ng-if="entry.isCurrencyAddressCreate" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <md-button ng-click="entry.createAddressByName(entry)">Create New</md-button>
                <md-menu ng-hide="entry.symbol==='HEAT'" md-position-mode="target-right target" md-offset="34px 34px">
                  <md-button aria-label="user menu" class="md-icon-button right" ng-click="$mdMenu.open($event)" md-menu-origin >
                    <md-icon md-font-library="material-icons">menu</md-icon>
                  </md-button>
                  <md-menu-content width="4">
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.restoreAddresses(entry)">
                        Restore addresses
                      </md-button>
                    </md-menu-item>
                  </md-menu-content>
                </md-menu>
                <!--<md-button class="name" ng-click="entry.restoreAddresses(entry.component)">Restore addresses</md-button>-->
              </div>

              <!-- Token Balance -->
              <div ng-if="entry.isTokenBalance" layout="row" class="token-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <div class="identifier" flex>{{entry.address}}</div>&nbsp;
                <div class="balance">{{entry.balance}}&nbsp;{{entry.symbol}}</div>
              </div>

            </md-list-item>
          </md-list>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope', '$q', 'localKeyStore', 'walletFile', '$window', 'lightwalletService', 'heat', 'assetInfo', 'ethplorer',
  '$mdToast', '$mdDialog', 'clipboard', 'user', 'bitcoreService', 'fimkCryptoService', 'nxtCryptoService',
  'ardorCryptoService', 'ltcCryptoService', 'ltcBlockExplorerService', 'bchCryptoService', 'bchBlockExplorerService',
  'nxtBlockExplorerService', 'ardorBlockExplorerService', 'mofoSocketService', 'iotaCoreService', 'storage', '$rootScope')
class WalletComponent extends wlt.WalletComponentAbstract {

  static displayUnlocked = false

  public static instance
  selectAll = true
  allLocked = true
  displayUnlocked = false

  //walletEntries: Array<wlt.WalletEntry> = []
  //createdAddresses: { [key: string]: Array<string> } = {}
  chains = [{name: 'HEAT', disabled: false}, {name: 'ETH', disabled: false}, {name: 'BTC', disabled: false},
    {name: 'FIMK', disabled: false}, {name: 'NXT', disabled: true}, {name: 'ARDR', disabled: true},
    {name: 'IOTA',disabled: false}, {name: 'LTC', disabled: false}, {name: 'BCH', disabled: false}];
  selectedChain = '';
  store: Store;

  private ltcBlockExplorerService: LtcBlockExplorerService;
  private bchBlockExplorerService: BchBlockExplorerService;
  private nxtBlockExplorerService: NxtBlockExplorerService;
  private ardorBlockExplorerService: ArdorBlockExplorerService;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              localKeyStore: LocalKeyStoreService,
              private walletFile: WalletFileService,
              private $window: angular.IWindowService,
              lightwalletService: LightwalletService,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              private ethplorer: EthplorerService,
              private $mdToast: angular.material.IToastService,
              public $mdDialog: angular.material.IDialogService,
              public clipboard: ClipboardService,
              private user: UserService,
              bitcoreService: BitcoreService,
              fimkCryptoService: FIMKCryptoService,
              nxtCryptoService: NXTCryptoService,
              ardorCryptoService: ARDORCryptoService,
              ltcCryptoService: LTCCryptoService,
              ltcBlockExplorerService: LtcBlockExplorerService,
              bchCryptoService: BCHCryptoService,
              bchBlockExplorerService: BchBlockExplorerService,
              nxtBlockExplorerService: NxtBlockExplorerService,
              ardorBlockExplorerService: ArdorBlockExplorerService,
              private mofoSocketService: MofoSocketService,
              iotaCoreService: IotaCoreService,
              private storage: StorageService,
              private $rootScope: angular.IScope) {

    super();
    this.localKeyStore = localKeyStore;
    this.iotaCoreService = iotaCoreService;
    this.lightwalletService = lightwalletService;
    this.fimkCryptoService = fimkCryptoService;
    this.ardorBlockExplorerService = ardorBlockExplorerService;
    this.nxtBlockExplorerService = nxtBlockExplorerService;
    this.bchBlockExplorerService = bchBlockExplorerService;
    this.bchCryptoService = bchCryptoService;
    this.ltcBlockExplorerService = ltcBlockExplorerService;
    this.ltcCryptoService = ltcCryptoService;
    this.ardorCryptoService = ardorCryptoService;
    this.nxtCryptoService = nxtCryptoService;
    this.bitcoreService = bitcoreService;
    WalletComponent.instance = this;
    this.store = wlt.getStore()

    this.displayUnlocked = WalletComponent.displayUnlocked
    $scope.$on('$destroy', () => WalletComponent.displayUnlocked = this.displayUnlocked)

    nxtBlockExplorerService.getBlockchainStatus().then(() => {
      let nxtChain = { name: 'NXT', disabled: false }
      let index = this.chains.findIndex((entry) => entry.name === nxtChain.name);
      this.chains[index] = nxtChain
    })

    ardorBlockExplorerService.getBlockchainStatus().then(() => {
      let ardorChain = { name: 'ARDR', disabled: false }
      let index = this.chains.findIndex((entry) => entry.name === ardorChain.name);
      this.chains[index] = ardorChain
    })

    this.initLocalKeyStore()
    wlt.initCreatedAddresses()
  }

  enterWalletEntryLabel(walletEntry: wlt.WalletEntry) {
    let p = [
      {label: `Visible label`, value: walletEntry.visibleLabel},
      {label: `Invisible label until login`, value: walletEntry.label}
    ]
    dialogs.simplePrompt(null, 'Enter Label', `Enter label for account ${walletEntry.identifier} or enter empty value to delete the label`, p).then(
      labels => {
        //save visible label
        walletEntry.visibleLabel = labels[0]?.trim()
        wlt.updateEntryVisibleLabel(walletEntry.visibleLabel, walletEntry.account, '', walletEntry.account)
        //save invisible label
        walletEntry.label = labels[1]?.trim()
        let password = this.localKeyStore.getPasswordForAccount(walletEntry.account)
        if (password) {
          try {
            let key = this.localKeyStore.load(walletEntry.account, password)
            if (key) {
              key.label = walletEntry.label || null
              this.localKeyStore.put(key)
            }
          } catch (e) { console.error(e) }
        }
      }
    )
  }

  enterCurrencyBalanceLabel(currencyBalance: wlt.CurrencyBalance) {
    let p = [
      {label: `Label`, value: currencyBalance.visibleLabel}
    ]
    dialogs.simplePrompt(null, 'Enter Label', `Enter label for entry "${currencyBalance.toString()}" or enter empty value to delete the label`, p).then(
      labels => {
        //save visible label
        currencyBalance.visibleLabel = labels[0]?.trim()
        wlt.updateEntryVisibleLabel(currencyBalance.visibleLabel, currencyBalance.address, currencyBalance.symbol, currencyBalance.walletEntry.account)
      }
    )
  }

  showSecret(secret: string, currencySymbol: string) {
    this.clipboard.showSecret(secret, currencySymbol)
  }

  changePincode($event, entry: wlt.WalletEntry) {
    dialogs.prompt($event, `Enter Password (or Pin) for ${entry.account}`, 'Please enter current Password (or Pin code) to confirm you wish to change it', '').then(pin => {
      if (pin != entry.pin) {
        this.showMessage('Wrong password')
        return
      }
      const key: ILocalKey = this.localKeyStore.load(entry.account, pin)
      dialogs.prompt($event, `Enter new Password (or Pin) for ${entry.account}`, 'Please enter new Password (or Pin code) for entry', '').then(newPincode => {
        key.pincode = newPincode
        this.localKeyStore.put(key)
        entry.pin = key.pincode
        this.showMessage(`Password is changed for ${entry.account}`)
      })
    })
  }

  signBitcoinMessage($event, entry: wlt.CurrencyBalance) {
    let sign = (message: string) => this.bitcoreService.signBitcoinMessage(entry.address, message, entry.secretPhrase)
    this.signMessage($event, entry, sign,
        "Sign Bitcoin Message",
        null,
        "Signed Bitcoin Message")
  }

  signEthereumMessage($event, entry: wlt.CurrencyBalance) {
    let sign = (message: string) => this.lightwalletService.signEthereumMessage(entry.address, message, entry.secretPhrase)
    this.signMessage($event, entry, sign,
        "Sign Ethereum Message",
        null,
        "Signed Ethereum Message")
  }

  signMessage($event, entry: wlt.CurrencyBalance, sign: (message: string) => any, title, description, resultTitle) {
    dialogs.simplePrompt($event,
        title,
        description || "Enter the message that will be signed by address's private key and then the signature can be used to prove address ownership:",
        [{label: "Message", value: "", required: true}]).then(
        result => {
          dialogs.dialog({
            id: 'signedBitcoinMessage',
            title: resultTitle,
            targetEvent: $event,
            locals: {
              address: entry.address,
              message: result[0],
              signature: sign(result[0])
            },
            style: `.sbm-value {
              font-family: monospace; 
              font-size: larger; 
              color: darkgrey;
            }
            `,
            template: `
              <p><label>Address:</label><br><span class="sbm-value">{{vm.address}}</span></p>
              <p><label>Message:</label><br><span class="sbm-value">{{vm.message}}</span></p>
              <p style="max-width: 400px;overflow-wrap: anywhere;"><label>Signature:</label><br><span class="sbm-value">{{vm.signature}}</span></p>
            `
          })
        }
    )
  }

  deleteAddressEntry(entry) {
    if (!entry.address || !entry.walletEntry) return
    let removingAddress = entry.address
    dialogs.confirm(`Remove ${entry.symbol} Address`,
        `This will remove ${entry.symbol} ${removingAddress} from your device.
      Please make sure you have saved the private key or you will lose access to the address.`).then(() => {
      if (!entry.walletEntry) return
      let walletEntry = entry.walletEntry
      walletEntry.currencies = walletEntry.currencies
          .filter((currency) => !(currency instanceof wlt.CurrencyBalance && removingAddress == currency.address));
      let currencySymbol = entry.symbol;
      wlt.getCryptoAddresses(walletEntry, currencySymbol).then(walletType => {
        let addressToDelete
        if (['FIM', /*'NXT', 'ARDR'*/].indexOf(entry.symbol) !== -1) {
          addressToDelete = walletType.addresses[0];
        } else {
          let address = walletType.addresses.find(address => address.address == removingAddress)
          if (address) addressToDelete = address
        }
        if (addressToDelete) {
          addressToDelete.isDeleted = true
          wlt.saveCryptoAddresses(walletEntry, currencySymbol, walletType).then(() => this.flatten())
        } else {
          this.flatten()
        }
      })
    });
  }

  restoreAddresses(walletEntry: wlt.WalletEntry, currencyName) {
    dialogs.confirm(`Restore ${currencyName} Addresses`, `This will try to restore removed addresses`)
        .then(() => {
          let resetAddressesPromise: Promise<WalletAddresses>
          if (currencyName === 'Ethereum') {
            resetAddressesPromise = this.lightwalletService.unlock(null, walletEntry.secretPhrase, true)
          } else if (currencyName === 'Bitcoin') {
            resetAddressesPromise = wlt.loadCryptoAddresses(walletEntry, 'BTC')
                .then(wa => this.bitcoreService.unlock(wa, walletEntry.secretPhrase, true))
          } else if (currencyName === 'FIMK') {
          } else if (currencyName === 'NXT') {
          } else if (currencyName === 'ARDOR') {
          } else if (currencyName === 'IOTA') {
          } else if (currencyName === 'Litecoin') {
            resetAddressesPromise = this.ltcCryptoService.unlock(walletEntry.secretPhrase)
          } else if (currencyName === 'BitcoinCash') {
            resetAddressesPromise = this.bchCryptoService.unlock(walletEntry.secretPhrase)
          } else if (currencyName === 'HEAT') {
          }
          if (resetAddressesPromise) {
            resetAddressesPromise.then(cryptoAddresses => {
              let forceWasCreated = true // guarantee set flag "created" from first address
              cryptoAddresses.addresses.forEach(a => {
                if (a.created) forceWasCreated = false
                if (forceWasCreated) a.created = true
                a.isDeleted = false
              })
              wlt.saveCryptoAddresses(walletEntry, wlt.CURRENCIES_MAP.get(currencyName).symbol, cryptoAddresses).then(() => {
                walletEntry.currencies = []
                this.initWalletEntry(walletEntry)
                walletEntry.toggle()
              })
            }, reason => {
              console.warn(`Currency ${currencyName} is not reset: ` + reason)
            })
          }
        });
  }

  getSelectedCurrencies(walletEntry) {
    let selectedCurrencies = this.store.get(walletEntry.account) || []
    return selectedCurrencies
  }

  createAddress(walletEntry, currencyName) {
    let node = walletEntry.currencies.find(c => c.isCurrencyAddressCreate && c.name == currencyName)
    if (currencyName == "Bitcoin") node.createBtcAddress(walletEntry)
    if (currencyName == "Ethereum") node.createEthAddress(walletEntry)
    if (currencyName == "FIMK") node.createFIMKAddress(walletEntry)
    if (currencyName == "NXT") node.createNXTAddress(walletEntry)
    if (currencyName == "ARDOR") node.createARDRAddress(walletEntry)
    if (currencyName == "Litecoin") node.createLtcAddress(walletEntry)
    if (currencyName == "BitcoinCash") node.createBchAddress(walletEntry)
    walletEntry.toggle(true)
  }

  createAccount($event) {
    let selected = this.$scope['vm'].selectedChain
    if (selected === 'ETH') {
      createEthAccount($event, this)
    } else if (selected === 'BTC') {
      createBtcAccount($event, this)
    } else if (selected === 'FIMK') {
      createFIMKAccount($event, this)
    } else if (selected === 'NXT') {
      createNXTAccount($event, this)
    } else if (selected === 'ARDR') {
      createARDRAccount($event, this)
    } else if (selected === 'IOTA') {
      createIotaAccount($event, this)
    } else if (selected === 'LTC') {
      createLtcAccount($event, this)
    } else if (selected === 'BCH') {
      createBCHAccount($event, this)
    } else if (selected === 'HEAT') {
      createHEATAccount($event, this)
      wlt.shouldBeSaved = this.exportWallet(true)
    }
    this.$scope['vm'].selectedChain = null
  }

  /* Iterates down all children of walletEntries and flattens them into the entries list */
  flatten() {
    this.$scope.$evalAsync(() => {
      this.entries = []
      this.walletEntries.forEach(walletEntry => {
        this.entries.push(walletEntry)
        walletEntry.currencies = walletEntry.currencies.filter((currency, index, self) => {
          //For wallet.CurrencyAddressCreate and currencyAddressLoading obj
          if (!currency.hasOwnProperty('address') && (currency.hasOwnProperty('isCurrencyAddressCreate') || currency.hasOwnProperty('isCurrencyAddressLoading'))) {
            return true
          }

          //For currencyBalance obj
          return index === self.findIndex((t) => (
            //@ts-ignore
            t.name === currency.name && t.address === currency.address
          ))
        });
        walletEntry.currencies.forEach(curr => {
          let currencyBalance = <wlt.CurrencyBalance>curr
          this.entries.push(currencyBalance)
          if (currencyBalance.tokens) {
            currencyBalance.tokens.forEach(tokenBalance => {
              this.entries.push(tokenBalance)
            })
          }
        })
      })
    })
  }

  shareCurrencyAddressesWithP2pContacts(currency: string, address: string) {
    let p2pContactsUtils = <ContactService>heat.$inject.get('contactService')
    let p2pMessaging = <P2PMessaging>heat.$inject.get('P2PMessaging')
    p2pMessaging.p2pContactStore.forEach((key, contact) => {
      console.log(`sharing key ${address} of currency ${currency} with p2p contact: ${contact.account}`)
      p2pContactsUtils.shareCryptoAddress(contact, currency, address)
    })
  }

  showMessage(message: string) {
    this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
  }

  pageAddAddSecretPhrase($event) {
    promptSecretPlusPassword($event, this).then(
      data => {
        let account = heat.crypto.getAccountId(data.secretPhrase)
        let publicKey = heat.crypto.secretPhraseToPublicKey(data.secretPhrase)
        let key = {
          account: account,
          secretPhrase: data.secretPhrase,
          pincode: data.password,
          name: '',
          publicKey
        };
        this.localKeyStore.put(key);
        this.$scope.$evalAsync(() => {
          this.initLocalKeyStore()
        })
      }
    )
  }

  pageAddFileInputChange(files) {
    if (files && files[0]) {
      let reader = new FileReader()
      reader.onload = () => {
        this.$scope.$evalAsync(() => {
          let fileContents = reader.result
          let data = this.walletFile.parseJSON(<string>fileContents)
          let p = Promise.resolve("Nothing imported")
          //let resultMessage = "Nothing imported"
          if (data && data["heatwallet-raw-data"]) {
            //resultMessage = this.walletFile.importRawData(data)
            //resultMessage += ".  The app will now restart..."
            p = p.then(s => this.walletFile.importRawData(data) + ".  The app will now restart...")
            setTimeout(() => window.location.reload(), 4000)
          } else {
            let wallet = this.walletFile.createFromText(data);
            if (wallet) {
              this.localKeyStore.import(wallet).then(addedKeys => {
                this.$scope.$evalAsync(() => {
                  this.initLocalKeyStore()
                  wlt.initCreatedAddresses()
                })
                let isBig = addedKeys.length > 8
                let report = (isBig ? addedKeys.filter((value, index) => index < 7) : addedKeys)
                    .map(v => v.account + (v.name ? "[" + v.name + "]" : ""))
                    .join(", ")
                if (isBig) report = report + "\n..."
                p = p.then(s => `Imported ${addedKeys.length} keys into this device: \n ${report}`)
                //resultMessage = `Imported ${addedKeys.length} keys into this device: \n ${report}`
              }).catch(reason => console.error(reason))
            }
          }
          p = p.then(s => this.$mdToast.show(this.$mdToast.simple().textContent(s).hideDelay(7000)))
        })
      }
      reader.readAsText(files[0])
    }
  }

  remove($event, entry: wlt.WalletEntry) {
    dialogs.prompt($event, 'Remove Wallet Entry',
      `This completely removes the wallet entry from your device.
       Please enter your Password (or Pin Code) to confirm you wish to remove this entry`, '').then(
        pin => {
          if (pin == entry.pin) {
            this.localKeyStore.remove(entry.account)
            this.initLocalKeyStore()
            if (entry.account === this.user.account) {
              this.heat.api.getKeystoreEntryCountByAccount(entry.account).then(count => {
                if (count > 0) {
                  this.shareCurrencyAddressesWithP2pContacts('BTC', '')
                }
              })
            }
          } else {
            this.$mdToast.show(this.$mdToast.simple().textContent('Incorrect Password (or Pin Code). Wallet Entry not removed.').hideDelay(5000));
          }
        }
      );
  }

  unlock($event, selectedWalletEntry?: wlt.WalletEntry) {
    dialogs.prompt($event, 'Enter Password (or Pin)', 'Please enter your Password (or Pin Code) to unlock', '').then(
      pin => {
        let count = 0
        this.walletEntries.forEach(walletEntry => {
          if (!walletEntry.secretPhrase) {
            var key = this.localKeyStore.load(walletEntry.account, pin);
            if (key) {
              count += 1
              this.localKeyStore.rememberPassword(walletEntry.account, pin)
              walletEntry.pin = pin
              walletEntry.secretPhrase = key.secretPhrase
              walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
              wlt.saveEntryBip44Compatible(walletEntry.account, walletEntry.bip44Compatible)
              walletEntry.label = key.label
              walletEntry.unlocked = true
              wlt.walletEntriesCache.set(walletEntry.account, walletEntry)
              this.initWalletEntry(walletEntry)
            }
          }
        })
        let message = `Unlocked ${count ? count : 'NO'} entries`
        this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
        selectedWalletEntry?.toggle(true)

        /* Only if no user is signed in currently, will we auto select one signin */
        if (!this.user.unlocked) {
          /* Try and unlock the selected entry */
          if (selectedWalletEntry?.unlocked) {
            for (let i = 0; i < selectedWalletEntry.currencies.length; i++) {
              let balance = <wlt.CurrencyBalance>selectedWalletEntry.currencies[i]
              if (balance.isCurrencyBalance) {
                balance.unlock(true)
                return
              }
            }
          }

          /* Try and find another wallet.CurrencyBalance */
          for (let i = 0; i < this.entries.length; i++) {
            let entry = <wlt.WalletEntry>this.entries[i];
            if (entry.unlocked) {
              for (let k = 0; k < entry.currencies.length; k++) {
                let balance = <wlt.CurrencyBalance>entry.currencies[k];
                if (balance.isCurrencyBalance) {
                  balance.unlock(true);
                  return
                }
              }
            }
          }

        }

      }
    )
  }

  initWalletEntry(walletEntry: wlt.WalletEntry) {
    this.allLocked = false
    let heatAccount = heat.crypto.getAccountIdFromPublicKey(heat.crypto.secretPhraseToPublicKey(walletEntry.secretPhrase))
    let heatCurrencyBalance = new wlt.CurrencyBalance(walletEntry, 'HEAT', 'HEAT', heatAccount, walletEntry.secretPhrase)
    heatCurrencyBalance.visible = walletEntry.expanded
    heatCurrencyBalance.pubKey = heat.crypto.secretPhraseToPublicKey(walletEntry.secretPhrase)
    walletEntry.currencies.push(heatCurrencyBalance)
    this.flatten()

    this.heat.api.getAccountByNumericId(heatAccount).then((account) => {
      this.$scope.$evalAsync(() => {
        heatCurrencyBalance.balance = utils.formatQNT(account.unconfirmedBalance, 8)
      })
      this.getAccountAssets(heatAccount).then((assetInfos) => {
        heatCurrencyBalance.tokens = []
        assetInfos.forEach(assetInfo => {
          let tokenBalance = new wlt.TokenBalance(walletEntry, assetInfo.name, assetInfo.symbol, assetInfo.id)
          tokenBalance.balance = utils.formatQNT(assetInfo.userBalance, assetInfo.decimals)
          tokenBalance.visible = walletEntry.expanded
          heatCurrencyBalance.tokens.push(tokenBalance)
        })
        this.flatten()
      })
    }, () => {
      this.$scope.$evalAsync(() => {
        heatCurrencyBalance.balance = "Address is unused"
      })
    });

    /* Bitcoin and Ethereum integration start here */
    if (walletEntry.selectedCurrencies.indexOf('BTC') > -1) {
      wlt.loadCryptoAddresses(walletEntry, 'BTC').then(wa => {
        this.bitcoreService.unlock(wa, walletEntry.secretPhrase).then(wallet => {
          if (wallet !== undefined) walletEntry.initBTC(this, wallet, this.user)
        })
      }).catch(reason => {console.log(reason)})
    }
    if (walletEntry.selectedCurrencies.indexOf('ETH') > -1) {
      wlt.loadCryptoAddresses(walletEntry, 'ETH').then(wa => {
        this.lightwalletService.unlock(wa, walletEntry.secretPhrase).then(walletAddresses => {
          walletEntry.initEth(this, walletAddresses)
        })
      }).catch(reason => {console.log(reason)})
    }
    if (walletEntry.selectedCurrencies.indexOf('IOTA') > -1) // removing nullity check since iota wallet then it tries to load iota for every mnemonic and throws error along with "plain text seed" on console
      this.iotaCoreService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initIota(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (walletEntry.selectedCurrencies.indexOf('FIM') > -1)
      this.fimkCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initFIMK(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (walletEntry.selectedCurrencies.indexOf('NXT') > -1)
      this.nxtCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initNXT(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (walletEntry.selectedCurrencies.indexOf('ARDR') > -1)
      this.ardorCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initARDOR(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (walletEntry.selectedCurrencies.indexOf('LTC') > -1)
      this.ltcCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        if (wallet !== undefined) {
          walletEntry.initLTC(this, wallet)
        }
      }).catch(reason => {console.log(reason)})
    if (walletEntry.selectedCurrencies.indexOf('BCH') > -1)
      this.bchCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        if (wallet !== undefined) {
          walletEntry.initBCH(this, wallet)
        }
      }).catch(reason => {console.log(reason)})
  }

  // handleFailedCryptoRequests(walletEntry, currencyAddressLoading, currencyName, currencySymbol) {
  //   this.$mdToast.show(this.$mdToast.simple().textContent(`Error. Cannot connect to ${currencySymbol} server.`).hideDelay(5000));
  //   let index = walletEntry.currencies.indexOf(currencyAddressLoading)
  //   let currencyBalance = new wlt.CurrencyBalance(currencyName, '', '', '')
  //   currencyBalance.balance = "No Connection"
  //   currencyBalance.visible = walletEntry.expanded
  //   currencyBalance.inUse = true
  //   currencyBalance.walletEntry = walletEntry
  //   currencyBalance.address = currencyAddressLoading.address
  //   walletEntry.currencies.splice(index, 0, currencyBalance)
  //   walletEntry.currencies = walletEntry.currencies.filter(c => c != currencyAddressLoading)
  //   this.flatten()
  // }

  private getAccountAssets(account: string): angular.IPromise<Array<AssetInfo>> {
    let deferred = this.$q.defer<Array<AssetInfo>>();
    this.heat.api.getAccountBalances(account, "0", 1, 0, 100).then(balances => {
      let assetInfos: Array<AssetInfo> = [];
      let promises = [];
      balances.forEach(balance => {
        if (balance.id != '0') {
          promises.push(
            this.assetInfo.getInfo(balance.id).then(info => {
              assetInfos.push(angular.extend({}, info, {
                userBalance: balance.virtualBalance
              }))
            })
          );
        }
      });
      if (promises.length > 0) {
        this.$q.all(promises).then(() => {
          assetInfos.sort((a, b) => {
            var textA = a.symbol.toUpperCase();
            var textB = b.symbol.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
          });
          const zero = new Big(0)
          assetInfos = assetInfos.filter(v => ! new Big(v.userBalance || 0).eq(zero))
          deferred.resolve(assetInfos);
        }, deferred.reject);
      }
      else {
        deferred.resolve([]);
      }
    }, deferred.reject);
    return <angular.IPromise<Array<AssetInfo>>>deferred.promise;
  }

  // @click
  importSeed($event) {
    promptSecretPlusPassword($event, this).then(
      data => {
        let account = heat.crypto.getAccountId(data.secretPhrase)
        let publicKey = heat.crypto.secretPhraseToPublicKey(data.secretPhrase)
        let key = {
          account: account,
          secretPhrase: data.secretPhrase,
          pincode: data.password,
          name: '',
          publicKey
        };
        this.localKeyStore.put(key);
        let message = `Seed was successfully imported under HEAT account ${account}`;
        this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
        this.user.unlock(data.secretPhrase, key, this.lightwalletService.validSeed(data.secretPhrase))
          .then(() => heat.fullApplicationScopeReload())
      }
    )
  }

  // @click
  exportWallet(onlyData?: boolean) {
    let accountCurrencies: Map<string, []> = new Map<string, []>()
    this.entries.forEach(entry => {
      if (entry instanceof wlt.WalletEntry) {
        let currencies: [] = this.store.get(entry.account)
        if (currencies) accountCurrencies.set(entry.account, currencies)
      }
    })

    // convert
    // [[account, Set],[account, Set],...]
    // to
    // [[account, [address1, address2,...]],[account, [address1, address2,...]],...]
    let accountAddressesArray = Object.entries(wlt.createdAddresses) // [[account, Set],[account, Set],...]
    let accountAddresses = accountAddressesArray
        .map(item => [item[0], Array.from(item[1])])
        .filter(v => v[1]?.length > 0)

    // @ts-ignore
    let exported = this.localKeyStore.export(accountCurrencies, accountAddresses)
    let paymentMessages = wlt.exportPaymentMessages()
    exported = Object.assign(exported, {paymentMessages: paymentMessages})

    let encoded = this.walletFile.encode(exported);
    let blob = new Blob([encoded], { type: "text/plain;charset=utf-8" });

    if (onlyData) return blob

    wlt.saveFile(blob, "heat.wallet")
  }

}
