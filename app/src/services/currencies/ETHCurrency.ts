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

const GWEI_SCALE = 1000000000

class ETHCurrency implements ICurrency {

  private ethBlockExplorerService: EthBlockExplorerService
  public symbol = 'ETH'
  public homePath
  private pendingService: EthereumPendingTransactionsService
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/ethereum-account/${this.address}`
    this.pendingService = heat.$inject.get('ethereumPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.ethBlockExplorerService.getBalance(this.address).then(
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
        if (data && data.txId) {
          let address = this.user.currency.address
          let timestamp = new Date().getTime()
          this.pendingService.add(address, data.txId, timestamp)
        } else {
          dialogs.alert($event, 'Send Ether Error', 'There was wrong response on sending transaction: ' + JSON.stringify(data))
        }
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
      this.cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      this.okButtonClick = function ($event) {
        let data = $scope['vm'].data
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let ethBlockExplorerService = <EthBlockExplorerService> heat.$inject.get('ethBlockExplorerService')
        let amountInWei = web3.web3.toWei(data.amount.replace(',',''), 'ether')
        let from = {privateKey: user.currency.secretPhrase, address: user.currency.address}
        $scope['vm'].disableOKBtn = true
        web3.createRawTx2(from, data.recipient, amountInWei, data.gasPrice * GWEI_SCALE, data.gasLimit).then((rawTx) => {
          ethBlockExplorerService.broadcast(rawTx).then(
            data => {
              if (data.txId) {
                $mdDialog.hide(data).then(() => {
                  dialogs.alert(event, 'Success', `TxHash: ${data.txId}`);
                })
              } else {
                dialogs.alert(event, 'Not success result', `Result: ${JSON.stringify(data)}`);
              }
            },
            err => {
              $mdDialog.hide(null).then(() => {
                dialogs.alert(event, 'Error', err ? (err.message || err.error ||  err) : "Error, see details in the console output");
              })
            }
          )
        })
      }
      this.disableOKBtn = false
      this.data = {
        amount: '',
        gasPrice: '',
        gasLimit: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.000420',
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let ethBlockExplorerService = <EthBlockExplorerService> heat.$inject.get('ethBlockExplorerService')
        ethBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = Number.parseFloat(info).toFixed(18)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} ETH`
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = error ? (error.message || error) : 'Invalid'
            })
          }
        )
      }, 1000, false)

      let web3 = <Web3Service> heat.$inject.get('web3')
      let settingsService: any = heat.$inject.get('settings')

      this.recipientChanged = function () {
        $scope['vm'].data.recipientInfo = ''
        lookup()
      }
      this.gasChanged = () => {
        $scope.$evalAsync(() => {
          this.data.fee = web3.web3.fromWei((this.data.gasPrice * GWEI_SCALE) * this.data.gasLimit, 'ether')
        })
      }
      web3.getGasPrice().then((gasprice) => {
        let data = $scope['vm'].data
        data.gasPrice = gasprice / GWEI_SCALE
        data.gasLimit = settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)
        data.fee = web3.web3.fromWei(gasprice * data.gasLimit, 'ether')
      })
    }

    let $q = heat.$inject.get('$q')
    let $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog')

    let deferred = $q.defer<{ txId:string }>()
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

                <md-input-container flex >
                  <label>Gas price (in GWei)</label>
                  <input ng-model="vm.data.gasPrice" ng-change="vm.gasChanged()" required name="gasPrice">
                </md-input-container>

                <md-input-container flex >
                  <label>Gas limit</label>
                  <input ng-model="vm.data.gasLimit" ng-change="vm.gasChanged()" required name="gasLimit">
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
