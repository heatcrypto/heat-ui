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

function createFIMKAccount($event, walletComponent: WalletComponent) {
  let walletEntries = walletComponent.walletEntries
  if (walletEntries.length == 0) return

  function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
    this.data = {
      selectedWalletEntry: walletEntries[0],
      selected: walletEntries[0].account,
      walletEntries: walletEntries,
      password: ''
    }

    this.copySeed = function () {
      walletComponent.clipboard.copyText(document.getElementById('wallet-secret-textarea')['value'], 'Copied seed to clipboard');
    }

    this.cancelButtonClick = function () {
      $mdDialog.cancel()
    }

    this.okButtonClick = function ($event) {
      let walletEntry: wlt.WalletEntry = this.data.selectedWalletEntry
      let success = false
      if (walletEntry) {
        let node = walletEntry.findAddressCreate(wlt.CURRENCIES.FIMK.symbol)
        if (!node) {
          walletEntry.selectedCurrencies = walletEntry.selectedCurrencies || []
          walletEntry.selectedCurrencies.push(wlt.CURRENCIES.FIMK.symbol)
          wlt.saveWalletEntryCurrencies(walletEntry.account, walletEntry.selectedCurrencies).then(
              () => walletComponent.initWalletEntry(walletEntry)
          )
        }
        // load in next event loop to load currency addresses first
        let interval = setInterval(() => {
          // @ts-ignore
          let node: CurrencyAddressCreate = walletEntry.currencies.find(c => {
            // @ts-ignore
            return c.isCurrencyAddressCreate && c.name == wlt.CURRENCIES.Ethereum.name
          })
          if (node) {
            success = node.createFIMKAddress(walletEntry)
            walletEntry.toggle(true)
            $mdDialog.hide(null).then(() => {
              if (!success) {
                dialogs.alert($event, 'Unable to Create Address', 'FIMK address already created for this account')
                // Refactor: set now so that the setTimeout dialog does not appear
                success = true;
              }
            })
            clearInterval(interval);
          }
        }, 200)
        setTimeout(() => {
          $mdDialog.hide(null).then(() => {
            if (!success) {
              dialogs.alert($event, 'Unable to Create Address', 'Something went wrong. Please try again later.')
            }
          })
          clearInterval(interval)
        }, 5000)
      }
    }

    this.selectedWalletEntryChanged = function () {
      this.data.password = ''
      this.data.selectedWalletEntry = walletEntries.find(w => this.data.selected == w.account)
    }

    this.passwordChanged = function () {
      walletComponent.updateWalletEntryOnPasswordChanged(this.data.selected, this.data.password)
    }
  }

  let deferred = walletComponent.$q.defer<{ password: string, secretPhrase: string }>()
  walletComponent.$mdDialog.show({
    controller: DialogController2,
    parent: angular.element(document.body),
    targetEvent: $event,
    clickOutsideToClose: false,
    controllerAs: 'vm',
    template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Create FIMK Address</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <p>To create a new FIMK address, please choose the master HEAT account you want to attach the new FIMK address to:</p>

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
                    <input type="password" ng-model="vm.data.password" ng-change="vm.passwordChanged()">
                  </md-input-container>
                </div>

                <!-- Invalid Non BIP44 Seed-->

                <p ng-if="vm.data.selectedWalletEntry && vm.data.selectedWalletEntry.unlocked && !vm.data.selectedWalletEntry.bip44Compatible">
                  FIMK wallet cannot be added to that old HEAT account. Please choose another or create a new HEAT account with BIP44 compatible seed.
                </p>

                <!-- Valid BIP44 Seed -->
                <div flex layout="column"
                  ng-if="vm.data.selectedWalletEntry && vm.data.selectedWalletEntry.unlocked && vm.data.selectedWalletEntry.bip44Compatible">

                  <p>This is your FIMK address seed, It’s the same as for your HEAT account {{vm.data.selectedWalletEntry.account}}.
                      Please store it in a safe place or you may lose access to your FIMK.
                      <a ng-click="vm.copySeed()">Copy Seed</a></p>

                  <md-input-container flex>
                    <textarea id="wallet-secret-textarea" rows="3" flex ng-model="vm.data.selectedWalletEntry.secretPhrase" readonly ng-trim="false"
                        style="font-family:monospace; font-size:16px; font-weight: bold; color: white; border: 1px solid white"></textarea>
                    <span style="display:none">{{vm.data.selectedWalletEntry.secretPhrase}}</span>
                  </md-input-container>

                </div>
              </div>

            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick($event)" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.selectedWalletEntry || !vm.data.selectedWalletEntry.unlocked || !vm.data.selectedWalletEntry.bip44Compatible"
                  class="md-primary" ng-click="vm.okButtonClick($event)" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
  }).then(deferred.resolve, deferred.reject);
  return deferred.promise
}
