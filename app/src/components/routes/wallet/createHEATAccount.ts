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

function createHEATAccount($event, walletComponent: WalletComponent) {

  function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
    this.cancelButtonClick = function () {
      $mdDialog.cancel()
    }
    this.okButtonClick = function () {
      const mnemonic = this.heatSeed;
      const pin = this.pin;

      let account = heat.crypto.getAccountId(mnemonic)
      let publicKey = heat.crypto.secretPhraseToPublicKey(mnemonic)
      let key = {
        account: account,
        secretPhrase: mnemonic,
        pincode: pin,
        name: '',
        publicKey
      };
      walletComponent.localKeyStore.add(key);
      $scope.$evalAsync(() => {
        walletComponent.initLocalKeyStore()
      })

      $mdDialog.cancel()
    }
    this.generateSeed = function () {
      this.heatSeed = walletComponent.lightwalletService.generateRandomSeed()
      walletComponent.$scope.$evalAsync(() => {
        this.calculatedAccountId = heat.crypto.getAccountId(this.heatSeed)
      })
    };
    this.generateSeed();
    this.copySeed = function () {
      walletComponent.clipboard.copyText(document.getElementById('wallet-secret-textarea')['value'], 'Copied seed to clipboard');
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
            <div class="md-toolbar-tools"><h2>Create HEAT Address</h2></div>
          </md-toolbar>
          <md-dialog-content style="min-width:500px;max-width:700px" layout="column" layout-padding>
            <div flex layout="column">
              <p>This is your HEAT address seed.
                Please store it in a safe place or you may lose access to your HEAT.
                <a ng-click="vm.copySeed()">Copy Seed</a>
              </p>
              <md-input-container flex>
                <textarea id="wallet-secret-textarea" rows="3" flex ng-model="vm.heatSeed" readonly ng-trim="false"
                    style="font-family:monospace; font-size:16px; font-weight: bold; color: white; border: 1px solid white"></textarea>
              </md-input-container>
              <span style="display:none">{{vm.heatSeed}}</span>
              <label style="color: grey; margin: -25px 0px 20px 0px;">Account {{vm.calculatedAccountId}}</label>
              <md-input-container flex>
                <label>Desired Heatwallet PIN / password</label>
                <input type="password" ng-model="vm.pin" required name="pin">
              </md-input-container>
            </div>
          </md-dialog-content>
          <md-dialog-actions>
            <md-button class="md-primary md-raised" ng-disabled="!vm.pin" ng-click="vm.okButtonClick($event)" aria-label="=Ok">Ok</md-button>
            <md-button class="md-primary md-raised" ng-click="vm.generateSeed($event)" aria-label="Generate New">Generate New</md-button>
            <md-button class="md-warn md-raised" ng-click="vm.cancelButtonClick($event)" aria-label="Cancel">Cancel</md-button>
          </md-dialog-actions>
        </form>
      </md-dialog>
      `
  }).then(deferred.resolve, deferred.reject);
  return deferred.promise
}
