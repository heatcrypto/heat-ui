/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
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

class TokenBalance {
  public isTokenBalance = true
  public balance: string
  public visible = false
  constructor(public name: string, public symbol: string, public address: string) {}
}

class CurrencyBalance {
  public isCurrencyBalance = true
  public balance: string
  public inUse = false
  public tokens: Array<TokenBalance> = []
  public visible = false
  constructor(public name: string, public symbol: string, public address: string, public secretPhrase: string) {}

  unlock() {
    let user = <UserService> heat.$inject.get('user')
    let $location = <angular.ILocationService> heat.$inject.get('$location')
    let lightwalletService = <LightwalletService> heat.$inject.get('lightwalletService')
    let bip44Compatible = lightwalletService.validSeed(this.secretPhrase)

    /* Create the ICurrency based on the currency type */
    let currency: ICurrency = null
    if (this.name=='Ethereum') {
      currency = new ETHCurrency(this.secretPhrase ,this.address)
    }
    else {
      currency = new HEATCurrency(this.secretPhrase, this.address)
    }

    user.unlock(this.secretPhrase,null,bip44Compatible, currency).then(
      () => {
        $location.path(currency.homePath)
        heat.fullApplicationScopeReload()
      }
    )
  }
}

class CurrencyAddressLoading {
  public isCurrencyAddressLoading = true
  public visible = false
  constructor(public name: string) {}
}

class CurrencyAddressCreate {
  public isCurrencyAddressCreate = true
  public visible = false
  public hidden = true
  public parent: WalletEntry
  public flatten: () => void
  constructor(public name: string, public wallet: WalletType) {}

  /* Handler for creating a new address, this method is declared here (on the node so to say)
    still after an architectural change where we dont display the CREATE node anymore.
    We'll be leaving it in place where all you need to do is set this.hidden=false to
    have it displayed again. */
  createAddress() {

    // collect all CurrencyBalance of 'our' same currency type
    let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

    // determine the first 'next' address based of the last currencyBalance displayed
    let lastAddress = currencyBalances[currencyBalances.length -1]['address']

    // look up the following address
    for (let i=0; i<this.wallet.addresses.length; i++) {

      // we've found the address
      if (this.wallet.addresses[i].address == lastAddress) {

        // next address is the one - but if no more addresses we exit since not possible
        if (i == this.wallet.addresses.length-1)
          return

        let nextAddress = this.wallet.addresses[i+1]
        let newCurrencyBalance = new CurrencyBalance('Ethereum','ETH',nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.visible = this.parent.expanded
        let index = this.parent.currencies.indexOf(currencyBalances[currencyBalances.length-1])+1
        this.parent.currencies.splice(index, 0, newCurrencyBalance)
        this.flatten()
        return
      }
    }
  }
}

class WalletEntry {
  public isWalletEntry=true
  public selected=true
  public identifier:string
  public secretPhrase:string
  public bip44Compatible: boolean
  public currencies: Array<CurrencyBalance|CurrencyAddressCreate|CurrencyAddressLoading> = []
  public pin:string
  public unlocked = false
  public visible = true
  public expanded = false
  constructor(public account: string, public name: string) {
    this.identifier = name ? `${name} | ${account}` : account
  }

  public toggle(forceVisible?: boolean) {
    this.expanded = forceVisible || !this.expanded
    this.currencies.forEach(curr => {
      let currency = <any>curr
      currency.visible = this.expanded
      if (currency.tokens) {
        currency.tokens.forEach(token => {
          token.visible = this.expanded
        })
      }
    })
  }
}

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
          Import Seed
        </md-button>

        <!-- Export Wallet to File -->
        <md-button class="md-warn md-raised" ng-click="vm.exportWallet()" aria-label="Export Wallet">
          <md-tooltip md-direction="bottom">Export Wallet File</md-tooltip>
          Export Wallet File
        </md-button>

        <!-- Create ETH Account -->
        <md-button class="md-warn md-raised" ng-click="vm.createEthAccount($event)" aria-label="Create Account"
              ng-disabled="vm.walletEntries.length==0">
          <md-tooltip md-direction="bottom">Create ETH Account</md-tooltip>
          Create ETH Account
        </md-button>
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
                <md-checkbox ng-model="entry.selected">
                  <md-tooltip md-direction="bottom">
                    Check this to include in wallet export
                  </md-tooltip>
                </md-checkbox>
                <span flex ng-if="entry.secretPhrase">
                  <a ng-click="entry.toggle()">{{entry.identifier}}</a>
                </span>
                <span flex ng-if="!entry.secretPhrase">
                  {{entry.identifier}}
                </span>
                <md-button ng-if="!entry.unlocked" ng-click="vm.unlock($event, entry)">Sign in</md-button>
                <md-button ng-if="entry.unlocked" ng-click="vm.remove($event, entry)">Remove</md-button>
              </div>

              <!-- Currency Balance -->
              <div ng-if="entry.isCurrencyBalance" layout="row" class="currency-balance" flex>
                <span class="name">{{entry.name}}</span>&nbsp;
                <span class="identifier" flex>
                  <a ng-click="entry.unlock()">{{entry.address}}</a>
                </span>&nbsp;
                <span class="balance">{{entry.balance}}&nbsp;{{entry.symbol}}</span>
              </div>

              <!-- Currency Address Loading -->
              <div ng-if="entry.isCurrencyAddressLoading" layout="row" class="currency-balance" flex>
                <span class="name">{{entry.name}}</span>&nbsp;
                <span class="identifier" flex>
                  Loading ..
                </span>
              </div>

              <!-- Currency Address Create -->
              <div ng-if="entry.isCurrencyAddressCreate" layout="row" class="currency-balance" flex>
                <span class="name">{{entry.name}}</span>&nbsp;
                <span class="identifier" flex></span>
                <md-button ng-click="entry.createAddress()">Create New</md-button>
              </div>

              <!-- Token Balance -->
              <div ng-if="entry.isTokenBalance" layout="row" class="token-balance" flex>
                <span class="name">{{entry.name}}</span>&nbsp;
                <span class="identifier" flex>{{entry.address}}</span>&nbsp;
                <span class="balance">{{entry.balance}}&nbsp;{{entry.symbol}}</span>
              </div>

            </md-list-item>
          </md-list>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','$q','localKeyStore','walletFile','$window',
  'lightwalletService','heat','assetInfo','ethplorer',
  '$mdToast','$mdDialog','clipboard')
class WalletComponent {

  selectAll = true;

  entries:Array<WalletEntry|CurrencyBalance|TokenBalance> = []
  walletEntries: Array<WalletEntry> = []

  constructor(private $scope: angular.IScope,
    private $q: angular.IQService,
    private localKeyStore: LocalKeyStoreService,
    private walletFile: WalletFileService,
    private $window: angular.IWindowService,
    private lightwalletService: LightwalletService,
    private heat: HeatService,
    private assetInfo: AssetInfoService,
    private ethplorer: EthplorerService,
    private $mdToast: angular.material.IToastService,
    private $mdDialog: angular.material.IDialogService,
    private clipboard: ClipboardService) {

    this.initLocalKeyStore()
  }

  initLocalKeyStore() {
    this.entries = []
    this.walletEntries = []
    this.localKeyStore.list().map((account:string) => {
      let name = this.localKeyStore.keyName(account)
      let walletEntry = new WalletEntry(account, name)
      this.walletEntries.push(walletEntry)
    });
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
            this.initWalletEntry(walletEntry)
          }
        } catch (e) { console.log(e) }
      }
    })
    this.flatten()
  }

  /* Iterates down all children of walletEntries and flattens them into the entries list */
  flatten() {
    this.$scope.$evalAsync(() => {
      this.entries = []
      this.walletEntries.forEach(walletEntry => {
        this.entries.push(walletEntry)
        walletEntry.currencies.forEach(curr => {
          let currencyBalance = <CurrencyBalance> curr
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

  pageAddAddSecretPhrase($event) {
    this.promptSecretPlusPassword($event).then(
      data => {
        let account = heat.crypto.getAccountId(data.secretPhrase)
        let key = {
          account: account,
          secretPhrase: data.secretPhrase,
          pincode: data.password,
          name: ''
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
          let wallet = this.walletFile.createFromText(fileContents);
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

  remove($event, entry:WalletEntry) {
    dialogs.prompt($event, 'Remove Wallet Entry',
      `This completely removes the wallet entry from your device.
       Please enter your pin code to confirm you wish to remove this entry`, '').then(
      pin => {
        if (pin == entry.pin) {
          this.localKeyStore.remove(entry.account)
          this.initLocalKeyStore()
        }
      }
    );
  }

  unlock($event, selectedWalletEntry: WalletEntry) {
    dialogs.prompt($event, 'Enter Pin Code', 'Please enter your pin code to unlock', '').then(
      pin => {
        this.walletEntries.forEach(walletEntry => {
          if (!walletEntry.secretPhrase) {
            var key = this.localKeyStore.load(walletEntry.account, pin);
            if (key) {
              this.localKeyStore.rememberPassword(walletEntry.account, pin)
              walletEntry.pin = pin
              walletEntry.secretPhrase = key.secretPhrase
              walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
              walletEntry.unlocked = true
              this.initWalletEntry(walletEntry)
            }
          }
        })
        selectedWalletEntry.toggle(true)
      }
    )
  }

  initWalletEntry(walletEntry: WalletEntry) {
    let heatAccount = heat.crypto.getAccountIdFromPublicKey(heat.crypto.secretPhraseToPublicKey(walletEntry.secretPhrase))
    let heatCurrencyBalance = new CurrencyBalance('HEAT', 'HEAT', heatAccount, walletEntry.secretPhrase)
    heatCurrencyBalance.visible = walletEntry.expanded
    walletEntry.currencies.push(heatCurrencyBalance)
    this.flatten()

    this.heat.api.getAccountByNumericId(heatAccount).then((account)=>{
      this.$scope.$evalAsync(()=> {
        let balanceUnconfirmed = utils.formatQNT(account.unconfirmedBalance, 8);
        heatCurrencyBalance.balance = balanceUnconfirmed
      })
      this.getAccountAssets(heatAccount).then((assetInfos) => {
        heatCurrencyBalance.tokens = []
        assetInfos.forEach(assetInfo => {
          let tokenBalance = new TokenBalance(assetInfo.name, assetInfo.symbol, assetInfo.id)
          tokenBalance.balance = utils.formatQNT(assetInfo.userBalance, 8)
          tokenBalance.visible = walletEntry.expanded
          heatCurrencyBalance.tokens.push(tokenBalance)
        })
        this.flatten()
      })
    }, () => {
      this.$scope.$evalAsync(()=> {
        heatCurrencyBalance.balance = "Address does not exist"
        heatCurrencyBalance.symbol = ''
      })
    });

    /* Ethereum integration starts here */
    if (walletEntry.bip44Compatible) {
      this.lightwalletService.unlock(walletEntry.secretPhrase, "").then(wallet => {

        let ethCurrencyAddressLoading = new CurrencyAddressLoading('Ethereum')
        ethCurrencyAddressLoading.visible = walletEntry.expanded
        walletEntry.currencies.push(ethCurrencyAddressLoading)

        let ethCurrencyAddressCreate = new CurrencyAddressCreate('Ethereum', wallet)
        ethCurrencyAddressCreate.visible = walletEntry.expanded
        ethCurrencyAddressCreate.parent = walletEntry
        ethCurrencyAddressCreate.flatten = this.flatten.bind(this)
        walletEntry.currencies.push(ethCurrencyAddressCreate)

        this.flatten()

        this.lightwalletService.refreshAdressBalances().then(() => {

          let index = walletEntry.currencies.indexOf(ethCurrencyAddressLoading)
          this.lightwalletService.wallet.addresses.forEach(address => {
            if (address.inUse) {
              let ethCurrencyBalance = new CurrencyBalance('Ethereum','ETH',address.address, address.privateKey)
              ethCurrencyBalance.balance = address.balance
              ethCurrencyBalance.visible = walletEntry.expanded
              walletEntry.currencies.splice(index, 0, ethCurrencyBalance)
              index++;

              address.tokensBalances.forEach(balance => {
                let tokenBalance = new TokenBalance(balance.name, balance.symbol, balance.address)
                tokenBalance.balance = utils.formatQNT(balance.balance, balance.decimals)
                tokenBalance.visible = walletEntry.expanded
                ethCurrencyBalance.tokens.push(tokenBalance)
              })
            }
          })

          // we can remove the loading entry
          walletEntry.currencies = walletEntry.currencies.filter(c => c!=ethCurrencyAddressLoading)
          this.flatten()
        })
      })
    }
  }

  private getAccountAssets(account:string): angular.IPromise<Array<AssetInfo>> {
    let deferred = this.$q.defer<Array<AssetInfo>>();
    this.heat.api.getAccountBalances(account, "0", 1, 0, 100).then(balances => {
      let assetInfos: Array<AssetInfo> = [];
      let promises = [];
      balances.forEach(balance=>{
        if (balance.id != '0') {
          promises.push(
            this.assetInfo.getInfo(balance.id).then(info=>{
              assetInfos.push(angular.extend(info, {
                userBalance: balance.virtualBalance
              }))
            })
          );
        }
      });
      if (promises.length > 0) {
        this.$q.all(promises).then(()=>{
          assetInfos.sort((a,b)=>{
            var textA = a.symbol.toUpperCase();
            var textB = b.symbol.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
          });
          deferred.resolve(assetInfos);
        }, deferred.reject);
      }
      else {
        deferred.resolve([]);
      }
    }, deferred.reject);
    return <angular.IPromise<Array<AssetInfo>>> deferred.promise;
  }

  // @click
  importSeed($event) {
    this.promptSecretPlusPassword($event).then(
      data => {
        let account = heat.crypto.getAccountId(data.secretPhrase)
        let key = {
          account: account,
          secretPhrase: data.secretPhrase,
          pincode: data.password,
          name: ''
        };
        this.localKeyStore.add(key);
        let message = `Seed was successfully imported to your wallet`;
        this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
        heat.fullApplicationScopeReload()

        // this.$scope.$evalAsync(() => {
        //   this.initLocalKeyStore()
        //   this.walletEntries.forEach(walletEntry => {
        //     if (walletEntry.account == account) {
        //       walletEntry.toggle(true)
        //     }
        //   })
        // })
      }
    )
  }

  // @click
  exportWallet() {
    let exported = this.localKeyStore.export();
    let encoded = this.walletFile.encode(exported);
    var blob = new Blob([encoded], {type: "text/plain;charset=utf-8"});
    saveAs(blob, 'heat.wallet');
  }

  promptSecretPlusPassword($event): angular.IPromise<{password:string, secretPhrase:string}> {
    function DialogController($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function () {
        $mdDialog.hide({
          password: $scope['vm'].data.password1,
          secretPhrase: $scope['vm'].data.secretPhrase,
        })
      }
      $scope['vm'].data = {
        password1: '',
        password2: '',
        secretPhrase: ''
      }
    }

    let deferred = this.$q.defer<{password:string, secretPhrase:string}>()
    this.$mdDialog.show({
      controller: DialogController,
      parent: angular.element(document.body),
      targetEvent: $event,
      clickOutsideToClose:false,
      controllerAs: 'vm',
      template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Hello</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <p>Enter your Secret Seed and provide a Password (or Pin)</p>
                <md-input-container flex>
                  <label>Secret phrase</label>
                  <textarea rows="2" flex ng-model="vm.data.secretPhrase" name="secretPhrase" required ng-trim="false"></textarea>
                </md-input-container>
                <md-input-container flex>
                  <label>Password</label>
                  <input ng-model="vm.data.password1" required name="password1">
                </md-input-container>
                <md-input-container flex>
                  <label>Password (confirm)</label>
                  <input ng-model="vm.data.password2" required name="password2">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="dialogForm.$invalid || vm.data.password1 != vm.data.password2" class="md-primary"
                  ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }

  createEthAccount($event) {
    let walletEntries = this.walletEntries
    let self = this
    if (walletEntries.length == 0)
      return

    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].copySeed = function () {
        self.clipboard.copyWithUI(document.getElementById('wallet-secret-textarea'), 'Copied seed to clipboard');
      }

      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      $scope['vm'].okButtonClick = function () {
        let walletEntry = $scope['vm'].data.selectedWalletEntry
        if (walletEntry) {
          let node = walletEntry.currencies.find(c => c.isCurrencyAddressCreate && c.name == 'Ethereum')
          node.createAddress()
          walletEntry.toggle(true)
        }
        $mdDialog.hide(null).then(() => {

        })
      }

      $scope['vm'].data = {
        selectedWalletEntry: walletEntries[0],
        selected: walletEntries[0].account,
        walletEntries: walletEntries,
        password: ''
      }

      $scope['vm'].selectedWalletEntryChanged = function () {
        $scope['vm'].data.password = ''
        $scope['vm'].data.selectedWalletEntry = walletEntries.find(w => $scope['vm'].data.selected==w.account)
      }

      $scope['vm'].passwordChanged = function () {
        let password = $scope['vm'].data.password
        let account = $scope['vm'].data.selected
        let walletEntry = walletEntries.find(w => w.account==account)
        try {
          var key = self.localKeyStore.load(account, password);
          if (key) {
            self.localKeyStore.rememberPassword(walletEntry.account, password)
            walletEntry.pin = password
            walletEntry.secretPhrase = key.secretPhrase
            walletEntry.bip44Compatible = self.lightwalletService.validSeed(key.secretPhrase)
            walletEntry.unlocked = true
            self.initWalletEntry(walletEntry)
            walletEntry.toggle(true)
          }
        } catch (e) {}
      }
    }

    let deferred = this.$q.defer<{password:string, secretPhrase:string}>()
    this.$mdDialog.show({
      controller: DialogController2,
      parent: angular.element(document.body),
      targetEvent: $event,
      clickOutsideToClose:false,
      controllerAs: 'vm',
      template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Create ETH Account</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <p>To create a new Ethereum address, please choose the master HEAT account you want to attach the new Ethereum address to:</p>

                <!-- Select Master Account -->

                <md-input-container flex>
                  <md-select ng-model="vm.data.selected" ng-change="vm.selectedWalletEntryChanged()">
                    <md-option ng-repeat="entry in vm.data.walletEntries" value="{{entry.account}}">{{entry.identifier}}</md-option>
                  </md-select>
                </md-input-container>

                <!-- Put In Password -->

                <div flex layout="column" ng-if="vm.data.selectedWalletEntry && !vm.data.selectedWalletEntry.unlocked">
                  <p>
                    Please first unlock this account by entering your password below
                  </p>
                  <md-input-container flex >
                    <label>Password</label>
                    <input ng-model="vm.data.password" ng-change="vm.passwordChanged()">
                  </md-input-container>
                </div>

                <!-- Invalid Non BIP44 Seed-->

                <p ng-if="vm.data.selectedWalletEntry && vm.data.selectedWalletEntry.unlocked && !vm.data.selectedWalletEntry.bip44Compatible">
                  Eth wallet cannot be added to that old HEAT account. Please choose another or create a new HEAT account with BIP44 compatible seed.
                </p>

                <!-- Valid BIP44 Seed -->
                <div flex layout="column"
                  ng-if="vm.data.selectedWalletEntry && vm.data.selectedWalletEntry.unlocked && vm.data.selectedWalletEntry.bip44Compatible">

                  <p>This is your Ethereum address seed, It’s the same as for your HEAT account {{vm.data.selectedWalletEntry.account}}.
                      Please store it in a safe place or you may lose access to your Ethereum.
                      <a ng-click="vm.copySeed()">Copy Seed</a></p>

                  <md-input-container flex>
                    <textarea rows="3" flex ng-model="vm.data.selectedWalletEntry.secretPhrase" readonly ng-trim="false"
                        id="wallet-secret-textarea"
                        style="font-family:monospace; font-size:16px; font-weight: bold; color: white; border: 1px solid white"></textarea>
                  </md-input-container>

                </div>
              </div>

            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.selectedWalletEntry || !vm.data.selectedWalletEntry.unlocked || !vm.data.selectedWalletEntry.bip44Compatible"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }

}
