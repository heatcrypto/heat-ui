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
  private recentBalance

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/ethereum-account/${this.address}`
    this.pendingService = heat.$inject.get('ethereumPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): PromiseLike<string> {
    let self = this
    self.recentBalance = wlt.getSavedCurrencyBalance(self.address, "ETH")
    return this.ethBlockExplorerService.getBalance(this.address).then(
      balance => {
        self.recentBalance = wlt.getSavedCurrencyBalance(self.address, "ETH", balance)
        return utils.commaFormat(new Big(self.recentBalance?.confirmed || "0").toFixed(18))
      },
      reason => {
        return utils.commaFormat(new Big(self.recentBalance?.confirmed || "0").toFixed(18))
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
    this.sendEther($event)
        .then(data => {
              if (data && data.txId) {
                let address = this.user.currency.address
                let timestamp = new Date().getTime()
                this.pendingService.add(address, data.txId, timestamp)
                return wlt.getHeatUnavailableReason(heatService, this.user.account)
                    .then(heatUnavailableReason => wlt.paymentMemoDialog(data.txId, heatUnavailableReason))
                    //.then(isPaymentMemo => todo refresh memo in the transaction list)
                    .catch(reason => {
                      if (reason) console.error(reason)
                    })
              }
            })
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendEther($event) {
    const self = this
    let web3 = <Web3Service> heat.$inject.get('web3')

    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      const vm = this
      this.paymentMessageMethod = null
      vm.stage = "create"
      vm.broadcastProviderAlternative = true

      this.data = {
        amount: '',
        gasPrice: '',
        gasLimit: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.000420',
        message: '',
        rawTx: ''
      }

      vm.generateTxnBytes = function () {
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let amountInWei = web3.web3.toWei(this.data.amount.replace(',',''), 'ether')
        let from = {privateKey: user.currency.secretPhrase, address: user.currency.address}

        let getAddressNonce = (address: string) => web3.getAddressNonce(address)
            .catch(reason => {
              return dialogs.simplePrompt(null,
                  'Enter ETH address nonce',
                  "The nonce is not resolved. Nonce is the outgoing transaction count from that address",
                  [{label: "Nonce", value: undefined}])
                  .then(value => value[0],
                          reason => {console.log('Dialog Get Address Nonce is escaped. ' + reason)}
                  )
            }).then(nonce => {
              if (typeof nonce === "string") return parseInt(nonce)
            })

        return web3.createRawTx2(from, this.data.recipient, amountInWei, this.data.gasPrice * GWEI_SCALE, this.data.gasLimit, getAddressNonce)
            // .then((rawTx) => {
            //   let clipboardService: ClipboardService = heat.$inject.get('clipboard')
            //   clipboardService.showTxnBytes("" + rawTx)
            // })
            .catch(reason => {
              dialogs.alert($event, 'ETH transaction creation error', reason)
            })
      }

      this.createTxnButtonClick = function ($event) {
        vm.generateTxnBytes().then(rawTx => {
          $scope.$evalAsync(() => {
            vm.data.rawTx = rawTx
            vm.stage = "broadcast"
            //just visual effect:
          })
          if (!rawTx) setTimeout(() => this.stage = "create", 1500)
        }).catch(reason => console.error(reason))
      }

      this.backButtonClick = function ($event) {
        this.stage = "create"
      }

      this.cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let updateUnconfirmedBalance = function (value, fees) {
        let txTotal = new Big(web3.web3.fromWei(new Big(value).plus(new Big(fees)), 'ether'))
        //let txTotal = new Big(value).plus(new Big(fees))
        if (self.recentBalance) {
          let unconfirmedBalance = self.recentBalance.confirmed
              ? new Big(self.recentBalance.confirmed).minus(txTotal).toString() : undefined
          wlt.saveCurrencyBalance(self.address, self.symbol, self.recentBalance.confirmed, unconfirmedBalance)
        }
      }

      this.okButtonClick = function ($event) {
        vm.disableOKBtn = true
        const ethBlockExplorerService = <EthBlockExplorerService> heat.$inject.get('ethBlockExplorerService')
        let ethService = vm.broadcastProviderAlternative
            ? <EthBlockExplorerService> ethBlockExplorerService.ethApiProviderAlternative
            : <EthBlockExplorerService> ethBlockExplorerService.ethApiProvider
        ethService.broadcast(vm.data.rawTx).then(
          result => {
            if (result.txId) {
              result.message = vm.data.message
              let sendingResult = Object.assign(result, {paymentMessageMethod: vm.paymentMessageMethod})
              let web3 = <Web3Service> heat.$inject.get('web3')
              let amountInWei = web3.web3.toWei(vm.data.amount.replace(',',''), 'ether')
              updateUnconfirmedBalance(amountInWei, web3.web3.toWei(vm.data.fee, 'ether'))
              $mdDialog.hide(sendingResult).then(() => {
                dialogs.alert(event, 'Success', `TxHash: ${result.txId}`)
              })
            } else {
              dialogs.alert(event, 'Not success result', `Result: ${JSON.stringify(result)}`, {multiple: true})
            }
          },
          err => {
            dialogs.alert(event, 'Error', err ? (err.message || err.error ||  err) : "Error, see details in the console output", {multiple: true})
          }
        ).finally(() => vm.disableOKBtn = false)
      }

      this.disableOKBtn = false

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

    let deferred = $q.defer<wlt.SendingResult>()
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
              <div flex layout="column" ng-if="vm.stage=='create'">

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
              
              <md-input-container flex ng-if="vm.stage=='broadcast'">
                  <label>Transaction bytes</label>
                  <textarea ng-model="vm.data.rawTx" readonly rows="3"  wrap="soft"
                        style="overflow-y: scroll;height: 210px;line-height: normal;"></textarea>
              </md-input-container>
                
            </md-dialog-content>
            
            <md-dialog-actions layout="row">
<!--
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.displaySignedBytesClick()" aria-label="Signed bytes">Signed transaction bytes</md-button>
-->
              <md-switch ng-if="vm.stage=='broadcast'" ng-model="vm.broadcastProviderAlternative" ng-change="vm.broadcastProviderChanged()">
                <label>Broadcast provider</label>
                <span ng-show="vm.broadcastProviderAlternative">Alternative</span>
                <span ng-hide="vm.broadcastProviderAlternative">Default</span>
              </md-switch>
        
              <span flex></span>
        
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
                            <md-button class="md-warn" ng-if="vm.stage=='broadcast'" ng-click="vm.backButtonClick()" aria-label="Back">Back</md-button>
              <md-button ng-if="vm.stage=='create'" ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.createTxnButtonClick()" aria-label="Create">Next</md-button>
              <md-button ng-if="vm.stage=='broadcast'" ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="Send now">Send</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }


}
