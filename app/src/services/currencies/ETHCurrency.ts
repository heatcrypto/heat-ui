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

class ETHCurrency implements ICurrency {

  private ethplorer: EthplorerService
  public symbol = 'ETH'
  public homePath
  private pendingTransactions: EthereumPendingTransactionsService
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.ethplorer = heat.$inject.get('ethplorer')
    this.user = heat.$inject.get('user')
    this.homePath = `/ethereum-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('ethereumPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.ethplorer.getBalance(this.address).then(
      balance => {
        return utils.commaFormat(new Big(balance+"").toFixed(18))
      }
    )
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void {
    return function () {}
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {
  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {
    this.sendEther($event).then(
      data => {
        let address = this.user.currency.address
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txHash, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send Ether Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendEther($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let amountInWei = web3.web3.toWei($scope['vm'].data.amount.replace(',',''), 'ether')
        let from = user.currency.address
        let to = $scope['vm'].data.recipient
        $scope['vm'].disableOKBtn = true
        web3.sendEther(from, to, amountInWei).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxHash: ${data.txHash}`);
            })
          },
          err => {
            $mdDialog.hide(null).then(() => {
              dialogs.alert(event, 'Error', err.message);
            })
          }
        )
      }
      $scope['vm'].disableOKBtn = false
      $scope['vm'].data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.000420'
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let ethplorer = <EthplorerService> heat.$inject.get('ethplorer')
        ethplorer.getAddressInfo($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = Number.parseFloat(info.ETH.balance).toFixed(18)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} ETH`
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = error.message||'Invalid'
            })
          }
        )
      }, 1000, false)
      $scope['vm'].recipientChanged = function () {
        $scope['vm'].data.recipientInfo = ''
        lookup()
      }
    }

    let $q = heat.$inject.get('$q')
    let $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog')

    let deferred = $q.defer<{ txHash:string }>()
    $mdDialog.show({
      controller: DialogController2,
      parent: angular.element(document.body),
      targetEvent: $event,
      clickOutsideToClose:false,
      controllerAs: 'vm',
      template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Send Ether</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in ETH</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <p>Fee: {{vm.data.fee}} ETH</p>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }


}
