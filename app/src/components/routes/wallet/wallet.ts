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
  constructor(public name: string) {}
}

class CurrencyAddressCreate {
  public isCurrencyAddressCreate = true
  constructor(public name: string, public address: string) {}
}

class WalletEntry {
  public isWalletEntry=true
  public selected=true
  public identifier:string
  public secretPhrase:string
  public bip44Compatible: boolean
  public currencies: Array<CurrencyBalance> = []
  public pin:string
  public unlocked = false
  public visible = true
  constructor(public account: string, public name: string) {
    this.identifier = name ? `${name} | ${account}` : account
  }

  public toggle(forceVisible?: boolean) {
    this.currencies.forEach(currency => {
      currency.visible = forceVisible || !currency.visible
      currency.tokens.forEach(token => {
        token.visible = forceVisible || !token.visible
      })
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

        <!-- Create HEAT account (forward to #/login) -->
        <!--
        <md-button class="md-warn md-raised" ng-href="#/login" aria-label="Create HEAT account">
          <md-tooltip md-direction="bottom">Create HEAT Account</md-tooltip>
          Create HEAT Account
        </md-button>
        -->

        <!-- Export Wallet to File -->
        <md-button class="md-warn md-raised" ng-click="vm.exportWallet()" aria-label="Export Wallet">
          <md-tooltip md-direction="bottom">Create HEAT Account</md-tooltip>
          Export Wallet File
        </md-button>
      </div>

      <div layout="column" layout-fill  flex>
        <div layout-fill layout="column" class="wallet-entries" flex>

          <!-- Build a wallet structure that contains ::
                - wallet entries
                - per entry currency balances
                - per currency token balances  -->

          <md-list layout-fill layout="column" flex>
            <md-list-item ng-repeat="entry in vm.entries" ng-if="entry.visible">

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
  'lightwalletService','heat','assetInfo','etherscanService','$mdToast','$mdDialog')
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
    private etherscanService: EtherscanService,
    private $mdToast: angular.material.IToastService,
    private $mdDialog: angular.material.IDialogService) {

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

  flatten() {
    this.entries = []
    this.walletEntries.forEach(walletEntry => {
      this.entries.push(walletEntry)
      walletEntry.currencies.forEach(currencyBalance => {
        this.entries.push(currencyBalance)
        currencyBalance.tokens.forEach(tokenBalance => {
          this.entries.push(tokenBalance)
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
          this.$scope.$evalAsync(() => {
            this.initLocalKeyStore()
          })
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
    let heatCurrencyBalance = new CurrencyBalance('HEAT','HEAT',heatAccount,walletEntry.secretPhrase)
    walletEntry.currencies.push(heatCurrencyBalance)
    this.heat.api.getAccountByNumericId(heatAccount).then((account)=>{
      this.$scope.$evalAsync(()=> {
        let balanceUnconfirmed = utils.formatQNT(account.unconfirmedBalance, 8);
        heatCurrencyBalance.balance = balanceUnconfirmed
      })
      this.getAccountAssets(heatAccount).then((assetInfos) => {
        this.$scope.$evalAsync(()=> {
          heatCurrencyBalance.tokens = []
          assetInfos.forEach(assetInfo => {
            let tokenBalance = new TokenBalance(assetInfo.name, assetInfo.symbol, assetInfo.id)
            tokenBalance.balance = utils.formatQNT(assetInfo.userBalance, 8)
            heatCurrencyBalance.tokens.push(tokenBalance)
          })
          this.flatten()
        })
      })
    }, () => {
      this.$scope.$evalAsync(()=> {
        heatCurrencyBalance.balance = "Address does not exist"
        heatCurrencyBalance.symbol = ''
      })
      this.flatten()
    });
    this.flatten()

    if (walletEntry.bip44Compatible) {
      this.lightwalletService.unlock(walletEntry.secretPhrase, "").then(() => {
        // the create new address entry
        //let addressCreate = new CurrencyAddressCreate('Ethereum',)


        let collect = []
        this.$scope.$evalAsync(()=> {
          this.lightwalletService.wallet.addresses.forEach(address => {
            if (address.inUse) {
              let ethCurrencyBalance = new CurrencyBalance('Ethereum','ETH',address.address,walletEntry.secretPhrase)
              walletEntry.currencies.push(ethCurrencyBalance)
              collect.push(ethCurrencyBalance)
            }
          })
          this.getEthBalances(collect)
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

  getEthBalances(collect: Array<CurrencyBalance>) {
    let addresses = collect.map(b => b.address)
    this.etherscanService.getEtherBalances(addresses).then(balances => {
      this.$scope.$evalAsync(() => {
        balances.forEach(b => {
          let balance = collect.find(_b => _b.address == b.address)
          if (balance) {
            balance.balance = b.balance
            balance.inUse = true
          }
        })
      })
    })
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
                <span>Enter your Secret Seed and provide a Password (or Pin)</span>
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


}
