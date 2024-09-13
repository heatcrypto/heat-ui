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

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string,
              private postAction?: (txId: string, message: string, paymentMessageMethod: number) => Promise<any>) {
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
    let heatService = <HeatService>heat.$inject.get('heat')
    wlt.getHeatUnavailableReason(heatService, this.user.account)
        .then(heatUnavailableReason => this.sendEther($event, heatUnavailableReason))
        .then(
            data => {
              if (data && data.txId) {
                let address = this.user.currency.address
                let timestamp = new Date().getTime()
                this.pendingService.add(address, data.txId, timestamp)
              }
              return data
            },
            err => {
              if (err) {
                dialogs.alert($event, 'Send Ether Error', 'There was an error sending this transaction: ' + JSON.stringify(err))
              }
            })
        .then(
            data => {
              if (!data) return
              this.postAction(data.txId, data.message, data.paymentMessageMethod).then(
                  v => console.log("ETH sending post action is performed " + v),
                  reason => dialogs.alert($event, 'ETH sending post action is not performed', reason)
              ).catch(reason => dialogs.alert($event, 'ETH sending post action error', reason))
            }
        )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendEther($event, heatUnavailableReason) {

    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      this.heatUnavailableReason = heatUnavailableReason.description
          || heatUnavailableReason.data?.errorDescription
          || heatUnavailableReason
      this.paymentMessageMethod = null
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
                data.message = $scope['vm'].data.message
                let sendingResult = Object.assign(data, {paymentMessageMethod: $scope['vm'].paymentMessageMethod})
                $mdDialog.hide(sendingResult).then(() => {
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

      this.displaySignedBytesClick = function ($event) {
        let data = $scope['vm'].data
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let amountInWei = web3.web3.toWei(data.amount.replace(',',''), 'ether')
        let from = {privateKey: user.currency.secretPhrase, address: user.currency.address}
        $scope['vm'].disableOKBtn = true
        web3.createRawTx2(from, data.recipient, amountInWei, data.gasPrice * GWEI_SCALE, data.gasLimit)
            .then((rawTx) => {
              let clipboardService: ClipboardService = heat.$inject.get('clipboard')
              clipboardService.showTxnBytes("" + rawTx)
            }, reason => console.error(reason))
            .then(value => $mdDialog.cancel())
      }

      this.disableOKBtn = false
      this.data = {
        amount: '',
        gasPrice: '',
        gasLimit: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.000420',
        message: ''
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

    let deferred = $q.defer<{ txId:string, message?: string, paymentMessageMethod: number }>()
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
                
                <md-input-container flex style="margin-bottom: 14px">
                  <label>Payment message / memo (encrypted)</label>
                  <input ng-model="vm.data.message" name="message" ng-maxlength="500" ng-disabled="!vm.paymentMessageMethod">
                  <div>Store message on:</div>
                  <md-radio-group ng-model="vm.paymentMessageMethod" layout="row" style="margin-left: 10px;">
                    <md-radio-button value=0 >This device</md-radio-button>
                    <md-radio-button value=1 ng-disabled="vm.heatUnavailableReason">Heat blockchain</md-radio-button>
                    <span ng-if="vm.heatUnavailableReason" style="color: grey"> &nbsp;&nbsp;({{vm.heatUnavailableReason}})</span>
                  </md-radio-group>
                </md-input-container>

                <p>Fee: {{vm.data.fee}} ETH</p>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.displaySignedBytesClick()" aria-label="OK">Signed transaction bytes</md-button>
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
