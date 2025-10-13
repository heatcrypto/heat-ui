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

function promptSecretPlusPassword($event, walletComponent: WalletComponent): angular.IPromise<{ password: string, secretPhrase: string }> {

  function DialogController($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
    this.cancelButtonClick = function () {
      $mdDialog.cancel()
    }
    this.okButtonClick = function () {
      let secretResult = this.data.secretPhraseProcessed || this.data.secretPhrase
      importWallet(secretResult, this.data.selectedImport).then(value => {
        setTimeout(() => {
          $mdDialog.hide({
            password: this.data.password1,
            secretPhrase: secretResult,
          })
        }, 200)
      })
    }
    let emptyValidator = () => null
    let bip44CompatibleValidator = () => {
      return walletComponent.lightwalletService.validSeed(this.data.secretPhrase)
        ? null
        : "Seed of the chosen currency must be compatible with BIP44"
    }
    let ethereumValidator = () => {
      this.data.secretPhraseProcessed = null
      let bip44Invalid = bip44CompatibleValidator()
      if (bip44Invalid) {
        //it is not the seed, so test if it is the private key
        let s = this.data.secretPhrase || ""
        this.data.secretPhraseProcessed = s = s.startsWith("0x") ? s.substring(2) : s
        if (utils.isHex(s) && s.length == 64) return
        return "Private key is not valid or " + bip44Invalid
      }
    }
    let bitcoinValidator = () => {
      this.data.secretPhraseProcessed = null
      let bip44Invalid = bip44CompatibleValidator()
      if (bip44Invalid) {
        // allowed raw hex pk or WIF pk
        let s = this.data.secretPhrase || ""
        this.data.secretPhraseProcessed = s = s.startsWith("0x") ? s.substring(2) : s
        //check is raw private key
        if (utils.isHex(s) && s.length == 64) return
        //check is WIF private key
        let regex = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/
        if (regex.test(s)) return
        return "Private key is not valid or " + bip44Invalid
      }
    }
    this.currencyList = [
      {name: 'HEAT', symbol: 'HEAT', validate: emptyValidator},
      {name: 'Ethereum', symbol: 'ETH', validate: ethereumValidator},
      {name: 'Bitcoin', symbol: 'BTC', validate: bitcoinValidator},
      {name: 'FIMK', symbol: 'FIM', validate: emptyValidator},
      {name: 'NXT', symbol: 'NXT', validate: emptyValidator},
      {name: 'ARDOR', symbol: 'ARDR', validate: emptyValidator},
      {name: 'IOTA', symbol: 'IOTA', validate: emptyValidator},
      {name: 'Litecoin', symbol: 'LTC', validate: bip44CompatibleValidator},
      {name: 'BitcoinCash', symbol: 'BCH', validate: bip44CompatibleValidator}
    ]
    this.data = {
      password1: '',
      password2: '',
      secretPhrase: '',
      secretPhraseProcessed: '',
      bip44Compatible: false,
      selectedImport: null
    }
    this.secretChanged = function () {
      this.data.bip44Compatible = walletComponent.lightwalletService.validSeed(this.data.secretPhrase)
    }
    this.invalidParameters = function () {
      let searchingSymbol = typeof this.data.selectedImport == "string"
        ? JSON.parse(this.data.selectedImport)?.symbol
        : this.data.selectedImport?.symbol
      let selectedCurrency = this.currencyList.find(item => item.symbol == searchingSymbol)
      if (selectedCurrency) {
        let validateResult = selectedCurrency.validate()
        if (validateResult) return validateResult
        if (this.data.password1 != this.data.password2) return "PINs are not equal"
        return null //parameters are ok
      }
      return "  " // parameters are not completed, so no error but invalid
    }
  }

  function importWallet(secret: string, selectedImport) {
    if (typeof selectedImport == "string") selectedImport = JSON.parse(selectedImport)
    let accountId = heat.crypto.getAccountId(secret)
    return wlt.saveWalletEntryCurrencies(accountId, [selectedImport.symbol]).then(() => {
      setTimeout(() => {
        let recreatedWalletComponent = WalletComponent.instance
        let walletEntry = recreatedWalletComponent.entries.find(entry => entry instanceof wlt.WalletEntry && entry.account == accountId)
        if (walletEntry) {
          let currencyAddressCreate: wlt.CurrencyAddressCreate =
              walletEntry.currencies.find(c => c.isCurrencyAddressCreate && c.name == selectedImport.name)
          currencyAddressCreate?.createAddressByName()
        }
      }, 2500)
    })
  }

  let deferred = walletComponent.$q.defer<{ password: string, secretPhrase: string }>()

  walletComponent.$mdDialog.show({
    controller: DialogController,
    parent: angular.element(document.body),
    targetEvent: $event,
    clickOutsideToClose: false,
    controllerAs: 'vm',
    template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Import Seed/Private Key</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <p>Select currency to import</p>
                <md-input-container flex>
                  <md-select ng-model="vm.data.selectedImport" placeholder="Select currency" auto-focus>
                    <md-option style="height: 30px;" ng-repeat="entry in vm.currencyList" value="{{entry}}">{{entry.symbol}}</md-option>
                  </md-select>
                </md-input-container>
                <p>Enter your Private Key / Secret Phrase / Wallet Seed and provide a Password (or PIN)</p>
                <md-input-container flex>
                  <label>Private key / secret phrase</label>
                  <textarea rows="2" flex ng-model="vm.data.secretPhrase" name="secretPhrase" required ng-trim="false" ng-change="vm.secretChanged() "></textarea>
                </md-input-container>
                <md-input-container flex>
                  <label>Desired Heatwallet PIN / password</label>
                  <input type="password" ng-model="vm.data.password1" required name="password1">
                </md-input-container>
                <md-input-container flex>
                  <label>Desired Heatwallet PIN / password (confirm)</label>
                  <input type="password" ng-model="vm.data.password2" required name="password2">
                </md-input-container>
                <span>BIP44 compatible = <b>{{vm.data.bip44Compatible?'TRUE':'FALSE'}}</b></span>
                <p>{{vm.invalidParameters()}}</p>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button type="submit" ng-disabled="dialogForm.$invalid || vm.invalidParameters() != null" class="md-primary"
                  ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
  }).then(deferred.resolve, deferred.reject);

  return deferred.promise
}
