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

  private ethBlockExplorerService: EthBlockExplorerService
  public symbol = wlt.CURRENCIES.Ethereum.symbol
  public homePath
  private pendingService: EthereumPendingTransactionsService
  private user: UserService
  private recentBalance: {confirmed: string, unconfirmed?: string} = {confirmed: ""}
  private format: (string) => string

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/ethereum-account/${this.address}`
    this.pendingService = heat.$inject.get('ethereumPendingTransactions')
    this.format = wlt.CURRENCIES_MAP.get(wlt.CURRENCIES.Ethereum.name).formatBalance
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): PromiseLike<string> {
    return wlt.getSavedCurrencyBalance(this.address, this.symbol)
        .then(r => this.recentBalance = r)
        .then(r => {
          return this.ethBlockExplorerService.getBalance(this.address).then(
              balance => {
                // todo save actual balance (if it is changed)
                this.recentBalance.confirmed = String(balance)
                return this.format(this.recentBalance.confirmed)
              }
          )
        }).finally(() => this.format(this.recentBalance.confirmed))
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
      vm.enterNonceManually = false

      const ethBlockExplorerService = <EthBlockExplorerService> heat.$inject.get('ethBlockExplorerService')
      //vm.broadcastProvider = [ethBlockExplorerService.ethApiProvider, ethBlockExplorerService.ethApiProviderAlternative]
      // vm.broadcastProviderIndex = 1
      vm.broadcastProvider = ethBlockExplorerService.ethBlockExplorerHeatNodeService
      vm.parsedTxFields = [['nonce'], ['hash'], ['from'], ['to'], ['gasPriceGwei', 'gas price'], ['valueEth', 'amount'], ['feeEth', 'fee']]

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

      vm.generateTxnBytes = function (forceEnterNonce = false) {
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let amountInWei = web3.web3.toWei(this.data.amount.replace(',',''), 'ether')
        let from = {privateKey: user.currency.secretPhrase, address: user.currency.address}

        let enterAddressNonce = (nonce?) => dialogs.simplePrompt(null,
            'Enter ETH address nonce',
            `${parseInt(nonce) >= 0 ? '' : 'The nonce is not defined. '}Nonce is the outgoing transaction count from that address`,
            [{label: "Nonce", value: nonce}])
            .then(value => value[0],
                reason => {
                  console.log('Dialog Get Address Nonce is escaped. ' + reason)
                }
            )

        let getAddressNonce = (address: string) => web3.getAddressNonce(address)
            .catch(reason => {
              console.info(reason)
              forceEnterNonce = true
              let info = wlt.getStore('currency-cache-eth').get(address + '-' + 'info')
              return info?.nonce
              //return db.getValue(wlt.CACHE_KEY.addressInfo('ETH', address)).then(info => info?.nonce)
            }).then(nonce => {
              return forceEnterNonce ? enterAddressNonce(nonce) : nonce
            }).then(nonce => {
              if (typeof nonce === "string") return parseInt(nonce)
            })

        return web3.createRawTx2(from, this.data.recipient, amountInWei, this.data.gasPrice * Web3Service.GWEI_SCALE, this.data.gasLimit, getAddressNonce)
            // .then((rawTx) => {
            //   let clipboardService: ClipboardService = heat.$inject.get('clipboard')
            //   clipboardService.showTxnBytes("" + rawTx)
            // })
            .catch(reason => {
              dialogs.alert($event, 'ETH transaction creation error', reason)
            })
      }

      let decodeRawTxHex = function (rawTxHex: string) {
        try {
          let parsedTx = heat.heatAppLib.ETHEREUM_PARSE_TRANSACTION({hex: rawTxHex})
          parsedTx.valueEth = web3.web3.fromWei(parsedTx.value, 'ether')
          parsedTx.gasPriceGwei = parsedTx.gasPrice / Web3Service.GWEI_SCALE  + ' GWei'
          parsedTx.feeEth = web3.web3.fromWei(parsedTx.gasPrice * parsedTx.gasLimit, 'ether') + ' ETH'
          return parsedTx
        } catch (e) {
          console.error(e)
        }
      }

      this.createTxnButtonClick = function ($event) {
        vm.data.rawTx = null
        vm.parsedTx = null
        vm.generateTxnBytes(vm.enterNonceManually).then(rawTx => {
          $scope.$evalAsync(() => {
            vm.stage = "broadcast"
            vm.data.rawTx = rawTx
            vm.parsedTx = decodeRawTxHex(rawTx)
          })
          if (!rawTx) setTimeout(() => $scope.$evalAsync(() => {this.stage = "create"}), 500)
        }).catch(reason => console.error(reason))
      }

      this.backButtonClick = function ($event) {
        vm.data.rawTx = ""
        vm.stage = "create"
      }

      this.useTxBytesButtonClick = function ($event) {
        vm.data.rawTx = ""
        vm.data.fee = ""
        vm.parsedTx = null
        vm.stage = "insertedBytes"
      }

      this.cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let updateUnconfirmedBalance = function (value, fees) {
        let txTotal = new Big(web3.web3.fromWei(new Big(value).plus(new Big(fees)), 'ether'))
        //let txTotal = new Big(value).plus(new Big(fees))
        let confirmedBalance = self.recentBalance?.confirmed
        let unconfirmedBalance = confirmedBalance ? new Big(confirmedBalance).minus(txTotal).toString() : undefined
        return wlt.saveCurrencyBalance(self.address, self.symbol, confirmedBalance, unconfirmedBalance)
      }

      this.disableOKBtn = false

      this.okButtonClick = function ($event) {
        vm.disableOKBtn = true
        // let provider = vm.broadcastProvider[vm.broadcastProviderIndex]
        vm.broadcastProvider.broadcast(vm.data.rawTx).then(
          result => {
            if (result.txId) {
              result.message = vm.data.message
              let sendingResult = Object.assign(result, {paymentMessageMethod: vm.paymentMessageMethod})
              let web3 = <Web3Service> heat.$inject.get('web3')
              let amountInWei = web3.web3.toWei(vm.data.amount.replace(',',''), 'ether')
              updateUnconfirmedBalance(amountInWei, web3.web3.toWei(vm.data.fee, 'ether')).finally(() => {
                $mdDialog.hide(sendingResult).then(() => {
                  dialogs.alert(event, 'Success', `TxHash: ${result.txId}`)
                })
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

      this.recipientChanged = () => {
        this.data.recipientInfo = ''
        lookup()
      }

      let decodeTxnDebounced = utils.debounce(() => {
        vm.parsedTx = decodeRawTxHex(vm.data.rawTx)
      }, 500, false)
      
      this.txnBytesChanged = function (event) {
        if (vm.stage != 'insertedBytes') return
        $scope.$evalAsync(() => {
          vm.report = ""
          decodeTxnDebounced()
        })
      }

      this.gasChanged = () => {
        $scope.$evalAsync(() => {
          this.data.fee = web3.web3.fromWei((this.data.gasPrice * Web3Service.GWEI_SCALE) * this.data.gasLimit, 'ether')
        })
      }

      this.showQRCode = (rawTx: string) => {
        let clipboardService: ClipboardService = heat.$inject.get('clipboard')
        clipboardService.showQRCode(rawTx, 320, 320)
      }

      web3.getGasPrice().then((gasprice) => {
        let data = $scope['vm'].data
        data.gasPrice = gasprice / Web3Service.GWEI_SCALE
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

                <p>
                  Fee: {{vm.data.fee}} ETH
                  <md-checkbox ng-model="vm.enterNonceManually" style="float:right">
                    Enter nonce manually
                  </md-checkbox>
                </p>
              </div>
              
              <md-input-container flex ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'">
                  <label>Transaction bytes</label>
                  <textarea ng-model="vm.data.rawTx" ng-readonly="vm.stage!='insertedBytes'" ng-change="vm.txnBytesChanged($event)"
                        rows="3" wrap="soft" style="overflow-y: scroll;height: 210px;line-height: normal;"></textarea>
                  <a ng-click="vm.showQRCode(vm.data.rawTx)" class="qrcode-link">
                    <md-tooltip>Show QR code</md-tooltip>
                    <md-icon md-font-library="material-icons" style="margin: 8px 0 16px 0;color: currentColor;">qr_code</md-icon>
                  </a>
              </md-input-container>
              
              <div flex ng-if="(vm.stage=='broadcast' || vm.stage=='insertedBytes') && vm.parsedTx">
                <label>Parsed transaction bytes report</label>
                <json-details data="vm.parsedTx" detailed-object="vm.parsedTx" fields="vm.parsedTxFields" compact="true"></json-details>
              </div>
              
              <!--<md-input-container flex ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'">
                  <p>Broadcast provider: <code>&nbsp;&nbsp;{{vm.broadcastProvider[vm.broadcastProviderIndex].getEndPoint()}}</code></p>
                  <md-radio-group ng-model="vm.broadcastProviderIndex" layout="row" ng-change="vm.broadcastProviderChanged()">
                    <md-radio-button value = 0>{{vm.broadcastProvider[0].getProviderName()}}</md-radio-button>
                    <md-radio-button value = 1>{{vm.broadcastProvider[1].getProviderName()}}</md-radio-button>
                  </md-radio-group>
              </md-input-container>-->
                
            </md-dialog-content>
            
            <md-dialog-actions layout="row">
<!--
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.displaySignedBytesClick()" aria-label="Signed bytes">Signed transaction bytes</md-button>
-->
<!--
              <md-switch ng-if="vm.stage=='broadcast'" ng-model="vm.broadcastProvider" ng-change="vm.broadcastProviderChanged()">
                <label>Broadcast provider</label>
                <span ng-show="vm.broadcastProvider">Alternative</span>
                <span ng-hide="vm.broadcastProvider">Default</span>
              </md-switch>
-->
        
              <span flex></span>
        
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button class="md-warn" ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'" ng-click="vm.backButtonClick()" aria-label="Back">Back</md-button>
              <md-button ng-if="vm.stage=='create'" ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.createTxnButtonClick()" aria-label="Create">Next</md-button>
              <md-button ng-if="vm.stage=='create'"
                  class="md-primary" ng-click="vm.useTxBytesButtonClick()" aria-label="Use transaction bytes">Use transaction bytes</md-button>
              <md-button ng-if="vm.stage=='broadcast' || (vm.stage=='insertedBytes')" 
                  ng-disabled="!vm.parsedTx" ng-click="vm.okButtonClick()"
                  class="md-primary" aria-label="Send now">Send now</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }


}
