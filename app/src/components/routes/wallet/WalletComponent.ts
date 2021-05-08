/*
 * The MIT License (MIT)
 * Copyright (c) 2021 Heat Ledger Ltd.
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

@RouteConfig('/wallet')
@Component({
  selector: 'wallet',
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
        <input type="file" onchange="angular.element(this).scope().vm.pageAddFileInputChange(this.files)" class="ng-hide" id="walet-input-file">

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
      </div>

      <div layout="column" layout-fill  flex>
        <div layout-fill layout="column" class="wallet-entries" flex>

          <!-- Build a wallet structure that contains ::
                - wallet entries
                - per entry currency balances
                - per currency token balances  -->

          <md-list layout-fill layout="column" flex>
            <md-list-item ng-repeat="entry in vm.entries" ng-if="entry.visible && !entry.hidden">

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

                <div flex ng-if="entry.secretPhrase" class="identifier"><a ng-click="entry.toggle()">{{entry.identifier}}</a>
                    <span class="label">{{entry.label}}</span>
                </div>
                <div flex ng-if="!entry.secretPhrase" class="identifier">{{entry.identifier}}</div>
                <md-button ng-if="!entry.unlocked" ng-click="vm.unlock($event, entry)">Sign in</md-button>

                <md-menu md-position-mode="target-right target" md-offset="34px 34px" ng-if="entry.unlocked">
                  <md-button aria-label="user menu" class="md-icon-button right" ng-click="$mdMenu.open($event)" md-menu-origin >
                    <md-icon md-font-library="material-icons">more_horiz</md-icon>
                  </md-button>
                  <md-menu-content width="4">
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.enterEntryLabel(entry)">
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
                      <md-button aria-label="explorer" ng-click="vm.remove($event, entry)">
                        <md-icon md-font-library="material-icons">delete_forever</md-icon>
                        Remove
                      </md-button>
                    </md-menu-item>
                  </md-menu-content>
                </md-menu>
              </div>

              <!-- Currency Balance -->
              <div ng-if="entry.isCurrencyBalance" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <div class="identifier" flex><a ng-click="entry.unlock()">{{entry.address}}</a></div>&nbsp;
                <div class="balance">{{entry.balance}}&nbsp;{{entry.symbol}}</div>
                <md-menu ng-hide="entry.symbol==='HEAT'" md-position-mode="target-right target" md-offset="34px 34px">
                  <md-button aria-label="user menu" class="md-icon-button right" ng-click="$mdMenu.open($event)" md-menu-origin >
                    <md-icon md-font-library="material-icons">more_horiz</md-icon>
                  </md-button>
                  <md-menu-content width="4">
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.showSecret(entry.secretPhrase, entry.symbol)">
                        <md-icon md-font-library="material-icons">file_copy</md-icon>
                        Show private key
                      </md-button>
                    </md-menu-item>
                    <md-menu-item>
                      <md-button aria-label="explorer" ng-click="vm.deleteEntry(entry)">
                        <md-icon md-font-library="material-icons">delete_forever</md-icon>
                        Remove address
                      </md-button>
                    </md-menu-item>
                </md-menu-content>
              </md-menu>
              </div>

              <!-- Currency Address Loading -->
              <div ng-if="entry.isCurrencyAddressLoading" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <div class="identifier" flex>Loading ..</div>
              </div>

              <!-- Currency Address Create -->
              <div ng-if="entry.isCurrencyAddressCreate" layout="row" class="currency-balance" flex>
                <div class="name">{{entry.name}}</div>&nbsp;
                <div class="identifier" flex></div>
                <md-button ng-click="entry.createAddress()">Create New</md-button>
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
class WalletComponent implements wlt.IWalletComponent {

  public static instance;
  selectAll = true;
  allLocked = true

  entries: Array<wlt.WalletEntry | wlt.CurrencyBalance | wlt.TokenBalance> = []
  walletEntries: Array<wlt.WalletEntry> = []
  createdAddresses: { [key: string]: Array<string> } = {}
  chains = [{ name: 'HEAT', disabled: false }, { name: 'ETH', disabled: false }, { name: 'BTC', disabled: false }, { name: 'FIMK', disabled: false }, { name: 'NXT', disabled: true }, { name: 'ARDR', disabled: true }, { name: 'IOTA', disabled: false }, { name: 'LTC', disabled: false }, { name: 'BCH', disabled: false }];
  selectedChain = '';
  store: Store;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              public localKeyStore: LocalKeyStoreService,
              private walletFile: WalletFileService,
              private $window: angular.IWindowService,
              public lightwalletService: LightwalletService,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              private ethplorer: EthplorerService,
              private $mdToast: angular.material.IToastService,
              public $mdDialog: angular.material.IDialogService,
              public clipboard: ClipboardService,
              private user: UserService,
              private bitcoreService: BitcoreService,
              private fimkCryptoService: FIMKCryptoService,
              private nxtCryptoService: NXTCryptoService,
              private ardorCryptoService: ARDORCryptoService,
              private ltcCryptoService: LTCCryptoService,
              private ltcBlockExplorerService: LtcBlockExplorerService,
              private bchCryptoService: BCHCryptoService,
              private bchBlockExplorerService: BchBlockExplorerService,
              private nxtBlockExplorerService: NxtBlockExplorerService,
              private ardorBlockExplorerService: ArdorBlockExplorerService,
              private mofoSocketService: MofoSocketService,
              private iotaCoreService: IotaCoreService,
              private storage: StorageService,
              private $rootScope: angular.IScope) {

    WalletComponent.instance = this;
    this.store = this.storage.namespace('wallet', $rootScope, true)
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
    this.initCreatedAddresses()
  }

  enterEntryLabel(entry: wlt.WalletEntry) {
    dialogs.simplePrompt(null, 'Enter Label',
      `Enter label for account ${entry.identifier} or enter empty value to delete the label`, '').then(
      label => {
        entry.label = label?.trim()
        this.saveLabel(entry.account, label)
      }
    )
  }

  saveLabel(account: string, label: string) {
    let password = this.localKeyStore.getPasswordForAccount(account)
    if (password) {
      try {
        let key = this.localKeyStore.load(account, password)
        if (key) {
          key.label = label ? label.trim() : null
          this.localKeyStore.add(key)
        }
      } catch (e) { console.error(e) }
    }
  }

  showSecret(secret: string, currencySymbol: string) {
    this.clipboard.showSecret(secret, currencySymbol)
  }

  deleteEntry(entry) {
    dialogs.confirm(`Remove ${entry.symbol} Address`,
      `This will remove ${entry.symbol} ${entry.address} from your device.
      Please make sure you have saved the private key or you will lose access to the address.`).then(() => {
      if (!entry.walletEntry) return
      let remainingCurrencyBalances = this.walletEntries
        .find((walletEntry) => entry.walletEntry.account === walletEntry.account)
        .currencies
        .filter((currency) => currency instanceof wlt.CurrencyBalance && entry.address !== currency.address);
      this.walletEntries
        .find((walletEntry) => walletEntry.account === entry.walletEntry.account)
        .currencies = remainingCurrencyBalances;
      let currency = entry.symbol;
      let heatAddress = entry.walletEntry.account;
      let store = this.storage.namespace('wallet-address', this.$rootScope, true);
      let encryptedWallet = store.get(`${currency}-${heatAddress}`)
      let decryptedWallet = heat.crypto.decryptMessage(encryptedWallet.data, encryptedWallet.nonce, heatAddress, entry.walletEntry.secretPhrase)
      let walletType = JSON.parse(decryptedWallet)
      if (['FIM', /*'NXT', 'ARDR'*/].indexOf(entry.symbol) !== -1) {
        walletType.addresses[0].isDeleted = true;
      } else {
        walletType.addresses = walletType.addresses.filter(address => address.address !== entry.address)
      }
      let encrypted = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, entry.walletEntry.secretPhrase)
      store.put(`${currency}-${heatAddress}`, encrypted);

      this.flatten()
    });
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
    }
    this.$scope['vm'].selectedChain = null
  }

  initLocalKeyStore() {
    this.entries = []
    this.walletEntries = []
    this.localKeyStore.list().map((account: string) => {
      let name = this.localKeyStore.keyName(account)
      let walletEntry = new wlt.WalletEntry(account, name, this)
      this.walletEntries.push(walletEntry)
    });
    this.walletEntries.sort((a, b) => {
      return a.account.localeCompare(b.account)
    })
    this.walletEntries.forEach(walletEntry => {
      let password = this.localKeyStore.getPasswordForAccount(walletEntry.account)
      if (password) {
        try {
          var key = this.localKeyStore.load(walletEntry.account, password);
          if (key) {
            walletEntry.secretPhrase = key.secretPhrase
            walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
            walletEntry.unlocked = true
            walletEntry.pin = password
            walletEntry.label = key.label
            this.initWalletEntry(walletEntry)
          }
        } catch (e) { console.log(e) }
      }
    })
    this.flatten()
    this.fetchCryptoAddresses('BTC')
  }

  initCreatedAddresses() {
    for (let i = 0; i < window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      let data = key.match(/eth-address-created:(.+):(.+)/)
      if (data) {
        let acc = data[1], addr = data[2]
        this.createdAddresses[acc] = this.createdAddresses[acc] || []
        this.createdAddresses[acc].push(addr)
      }
    }
  }

  rememberAdressCreated(account: string, ethAddress: string) {
    this.createdAddresses[account] = this.createdAddresses[account] || []
    this.createdAddresses[account].push(ethAddress)
    window.localStorage.setItem(`eth-address-created:${account}:${ethAddress}`, "1")
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

  fetchCryptoAddresses(currency: string) {
    let p2pContactsUtils = <ContactService>heat.$inject.get('contactService')
    let p2pMessaging = <P2PMessaging>heat.$inject.get('P2PMessaging')
    p2pMessaging.p2pContactStore.forEach((key, contact) => {
      console.log(`fetching ${currency} of p2p contact: ${contact.account}`)
      p2pContactsUtils.fetchCryptoAddress(contact, currency)
    })
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
        this.localKeyStore.add(key);
        this.$scope.$evalAsync(() => {
          this.initLocalKeyStore()
        })
      }
    )
  }

  pageAddFileInputChange(files) {
    if (files && files[0]) {
      let reader = new FileReader();
      reader.onload = () => {
        this.$scope.$evalAsync(() => {
          let fileContents = reader.result;
          let wallet = this.walletFile.createFromText(<string>fileContents);
          if (wallet) {
            let addedKeys = this.localKeyStore.import(wallet);
            this.$scope.$evalAsync(() => {
              this.initLocalKeyStore();
            })
            let message = `Imported ${addedKeys.length} keys into this device`;
            this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
          }
        })
      };
      reader.readAsText(files[0]);
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

  unlock($event, selectedWalletEntry: wlt.WalletEntry) {
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
              walletEntry.label = key.label
              walletEntry.unlocked = true
              this.initWalletEntry(walletEntry)
            }
          }
        })
        let message = `Unlocked ${count ? count : 'NO'} entries`
        this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
        selectedWalletEntry.toggle(true)

        /* Only if no user is signed in currently, will we auto select one signin */
        if (!this.user.unlocked) {
          /* Try and unlock the selected entry */
          if (selectedWalletEntry.unlocked) {
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
    let heatCurrencyBalance = new wlt.CurrencyBalance('HEAT', 'HEAT', heatAccount, walletEntry.secretPhrase)
    heatCurrencyBalance.visible = walletEntry.expanded
    walletEntry.currencies.push(heatCurrencyBalance)
    this.flatten()

    this.heat.api.getAccountByNumericId(heatAccount).then((account) => {
      this.$scope.$evalAsync(() => {
        let balanceUnconfirmed = utils.formatQNT(account.unconfirmedBalance, 8);
        heatCurrencyBalance.balance = balanceUnconfirmed
      })
      this.getAccountAssets(heatAccount).then((assetInfos) => {
        heatCurrencyBalance.tokens = []
        assetInfos.forEach(assetInfo => {
          let tokenBalance = new wlt.TokenBalance(assetInfo.name, assetInfo.symbol, assetInfo.id)
          tokenBalance.balance = utils.formatQNT(assetInfo.userBalance, assetInfo.decimals)
          tokenBalance.visible = walletEntry.expanded
          heatCurrencyBalance.tokens.push(tokenBalance)
        })
        this.flatten()
      })
    }, () => {
      this.$scope.$evalAsync(() => {
        heatCurrencyBalance.balance = "Address is unused"
        heatCurrencyBalance.symbol = ''
      })
    });

    /* Bitcoin and Ethereum integration start here */
    let selectedCurrencies = this.store.get(walletEntry.account) || []
    if (selectedCurrencies.indexOf('BTC') > -1)
      this.bitcoreService.unlock(walletEntry.secretPhrase).then(wallet => {
        if (wallet !== undefined) {
          walletEntry.initBTC(this, wallet, this.user)
        }
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('ETH') > -1)
      this.lightwalletService.unlock(walletEntry.secretPhrase, "").then(wallet => {
        walletEntry.initEth(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('IOTA') > -1) // removing nullity check since iota wallet then it tries to load iota for every mnemonic and throws error along with "plain text seed" on console
      this.iotaCoreService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initIota(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('FIM') > -1)
      this.fimkCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initFIMK(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('NXT') > -1)
      this.nxtCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initNXT(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('ARDR') > -1)
      this.ardorCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        walletEntry.initARDOR(this, wallet)
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('LTC') > -1)
      this.ltcCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        if (wallet !== undefined) {
          walletEntry.initLTC(this, wallet)
        }
      }).catch(reason => {console.log(reason)})
    if (selectedCurrencies.indexOf('BCH') > -1)
      this.bchCryptoService.unlock(walletEntry.secretPhrase).then(wallet => {
        if (wallet !== undefined) {
          walletEntry.initBCH(this, wallet)
        }
      }).catch(reason => {console.log(reason)})
  }

  public loadNXTAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let nxtCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies.find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'NXT')
    if (!nxtCurrencyAddressLoading)
      return

    this.nxtCryptoService.refreshAdressBalances(nxtCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(nxtCurrencyAddressLoading)
      nxtCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let nxtCurrencyBalance = new wlt.CurrencyBalance('NXT', 'NXT', address.address, address.privateKey)
          nxtCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
          nxtCurrencyBalance.visible = walletEntry.expanded
          nxtCurrencyBalance.inUse = wasCreated ? false : true
          nxtCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, nxtCurrencyBalance)
          index++;

          if (address.tokensBalances) {
            address.tokensBalances.forEach(balance => {
              let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
              tokenBalance.balance = utils.commaFormat(balance.balance)
              tokenBalance.visible = walletEntry.expanded
              nxtCurrencyBalance.tokens.push(tokenBalance)
            })
          }
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != nxtCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, nxtCurrencyAddressLoading, 'NXT', 'NXT')
    })
  }

  public loadARDORAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let ardorCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'ARDOR')
    if (!ardorCurrencyAddressLoading) return

    this.ardorCryptoService.refreshAdressBalances(ardorCurrencyAddressLoading.wallet).then(() => {
      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(ardorCurrencyAddressLoading)
      ardorCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let ardrCurrencyBalance = new wlt.CurrencyBalance('ARDOR', 'ARDR', address.address, address.privateKey)
          ardrCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
          ardrCurrencyBalance.visible = walletEntry.expanded
          ardrCurrencyBalance.inUse = wasCreated ? false : true
          ardrCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, ardrCurrencyBalance)
          index++;

          if (address.tokensBalances) {
            address.tokensBalances.forEach(balance => {
              let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
              tokenBalance.balance = utils.commaFormat(balance.balance)
              tokenBalance.visible = walletEntry.expanded
              ardrCurrencyBalance.tokens.push(tokenBalance)
            })
          }
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != ardorCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, ardorCurrencyAddressLoading, 'ARDOR', 'ARDR')
    })
  }

  /* Only when we expand a wallet entry do we lookup its balances */
  public loadFIMKAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let fimkCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'FIMK')
    if (!fimkCurrencyAddressLoading) return

    this.fimkCryptoService.refreshAdressBalances(fimkCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(fimkCurrencyAddressLoading)
      fimkCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let fimkCurrencyBalance = new wlt.CurrencyBalance('FIMK', 'FIM', address.address, address.privateKey)
          fimkCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
          fimkCurrencyBalance.visible = walletEntry.expanded
          fimkCurrencyBalance.inUse = wasCreated ? false : true
          fimkCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, fimkCurrencyBalance)
          index++;

          if (address.tokensBalances) {
            address.tokensBalances.forEach(balance => {
              let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
              tokenBalance.balance = utils.commaFormat(balance.balance)
              tokenBalance.visible = walletEntry.expanded
              fimkCurrencyBalance.tokens.push(tokenBalance)
            })
          }
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != fimkCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, fimkCurrencyAddressLoading, 'FIMK', 'FIM')
    })
  }

  /* Only when we expand a wallet entry do we lookup its balances */
  public loadEthereumAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let ethCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Ethereum')
    if (!ethCurrencyAddressLoading) return

    this.lightwalletService.refreshAdressBalances(ethCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(ethCurrencyAddressLoading)
      ethCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let ethCurrencyBalance = new wlt.CurrencyBalance('Ethereum', 'ETH', address.address, address.privateKey)
          ethCurrencyBalance.balance = Big(address.balance).toFixed()
          ethCurrencyBalance.visible = walletEntry.expanded
          ethCurrencyBalance.inUse = wasCreated ? false : true
          ethCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, ethCurrencyBalance)
          index++;

          if (address.tokensBalances) {
            address.tokensBalances.forEach(balance => {
              let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
              tokenBalance.balance = utils.commaFormat(balance.balance)
              tokenBalance.visible = walletEntry.expanded
              ethCurrencyBalance.tokens.push(tokenBalance)
            })
          }
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != ethCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, ethCurrencyAddressLoading, 'Ethereum', 'ETH')
    })
  }

  public loadIotaAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let iotaCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Iota')
    if (!iotaCurrencyAddressLoading) return

    this.iotaCoreService.refreshAdressBalances(iotaCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(iotaCurrencyAddressLoading)
      iotaCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let iotaCurrencyBalance = new wlt.CurrencyBalance('Iota', 'i', address.address, address.privateKey)
          iotaCurrencyBalance.balance = Number(address.balance + "").toFixed(0)
          iotaCurrencyBalance.visible = walletEntry.expanded
          iotaCurrencyBalance.inUse = wasCreated ? false : true
          iotaCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, iotaCurrencyBalance)
          index++;
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != iotaCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, iotaCurrencyAddressLoading, 'IOTA', 'IOTA')
    })
  }


  /* Only when we expand a wallet entry do we lookup its balances */
  public loadBitcoinAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let btcCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Bitcoin')
    if (!btcCurrencyAddressLoading) return

    this.bitcoreService.refreshAdressBalances(btcCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(btcCurrencyAddressLoading)
      btcCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let btcCurrencyBalance = new wlt.CurrencyBalance('Bitcoin', 'BTC', address.address, address.privateKey)
          btcCurrencyBalance.balance = (address.balance || "0") + ""
          btcCurrencyBalance.visible = walletEntry.expanded
          btcCurrencyBalance.inUse = !wasCreated
          btcCurrencyBalance.walletEntry = walletEntry
          walletEntry.currencies.splice(index, 0, btcCurrencyBalance)
          index++;
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != btcCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, btcCurrencyAddressLoading, 'Bitcoin', 'BTC')
    })
  }

  /* Only when we expand a wallet entry do we lookup its balances */
  public loadBitcoinCashAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let bchCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'BitcoinCash')
    if (!bchCurrencyAddressLoading) return

    this.bchCryptoService.refreshAdressBalances(bchCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(bchCurrencyAddressLoading)
      bchCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address.split(":")[1]) != -1
        if (address.inUse || wasCreated) {
          let bchCurrencyBalance = new wlt.CurrencyBalance('BitcoinCash', 'BCH', address.address, address.privateKey)
          bchCurrencyBalance.balance = address.balance + ""
          bchCurrencyBalance.visible = walletEntry.expanded
          bchCurrencyBalance.inUse = wasCreated ? false : true
          bchCurrencyBalance.walletEntry = walletEntry

          walletEntry.currencies.splice(index, 0, bchCurrencyBalance)
          index++;
        }
      })

      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != bchCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, bchCurrencyAddressLoading, 'BitcoinCash', 'BCH')
    })
  }

  public loadLtcAddresses(walletEntry: wlt.WalletEntry) {

    /* Find the Loading node, if thats not available we can exit */
    let ltcCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
      .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Litecoin')
    if (!ltcCurrencyAddressLoading) return

    this.ltcCryptoService.refreshAdressBalances(ltcCurrencyAddressLoading.wallet).then(() => {

      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading']))
        return

      let index = walletEntry.currencies.indexOf(ltcCurrencyAddressLoading)
      ltcCurrencyAddressLoading.wallet.addresses.forEach(address => {
        let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
        if (address.inUse || wasCreated) {
          let ltcCurrencyBalance = new wlt.CurrencyBalance('Litecoin', 'LTC', address.address, address.privateKey)
          ltcCurrencyBalance.balance = address.balance + ""
          ltcCurrencyBalance.visible = walletEntry.expanded
          ltcCurrencyBalance.inUse = wasCreated ? false : true
          ltcCurrencyBalance.walletEntry = walletEntry

          walletEntry.currencies.splice(index, 0, ltcCurrencyBalance)
          index++;
        }
      })

      walletEntry.currencies = walletEntry.currencies.filter(c => c != ltcCurrencyAddressLoading)
      this.flatten()
    }).catch(() => {
      this.handleFailedCryptoRequests(walletEntry, ltcCurrencyAddressLoading, 'Litecoin', 'LTC')
    })
  }

  private handleFailedCryptoRequests(walletEntry, currencyAddressLoading, currencyName, currencySymbol) {
    this.$mdToast.show(this.$mdToast.simple().textContent(`Error. Cannot connect to ${currencySymbol} server.`).hideDelay(5000));
    let index = walletEntry.currencies.indexOf(currencyAddressLoading)
    let currencyBalance = new wlt.CurrencyBalance(currencyName, '', '', '')
    currencyBalance.balance = "No Connection"
    currencyBalance.visible = walletEntry.expanded
    currencyBalance.inUse = true
    currencyBalance.walletEntry = walletEntry
    walletEntry.currencies.splice(index, 0, currencyBalance)

    walletEntry.currencies = walletEntry.currencies.filter(c => c != currencyAddressLoading)
    this.flatten()
  }


  private getAccountAssets(account: string): angular.IPromise<Array<AssetInfo>> {
    let deferred = this.$q.defer<Array<AssetInfo>>();
    this.heat.api.getAccountBalances(account, "0", 1, 0, 100).then(balances => {
      let assetInfos: Array<AssetInfo> = [];
      let promises = [];
      balances.forEach(balance => {
        if (balance.id != '0') {
          promises.push(
            this.assetInfo.getInfo(balance.id).then(info => {
              assetInfos.push(angular.extend(info, {
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
        this.localKeyStore.add(key);
        let message = `Seed was successfully imported under HEAT account ${account}`;
        this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
        this.user.unlock(data.secretPhrase, key, this.lightwalletService.validSeed(data.secretPhrase))
          .then(() => heat.fullApplicationScopeReload())
      }
    )
  }

  // @click
  exportWallet() {
    let exported = this.localKeyStore.export();
    let encoded = this.walletFile.encode(exported);
    var blob = new Blob([encoded], { type: "text/plain;charset=utf-8" });
    saveAs(blob, 'heat.wallet');
  }

}
