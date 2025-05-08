class BTCCurrency implements ICurrency {

  /**
   * request parameters "type of btc address" from the user for btc address creation
   */
  public static requestBtcAddressType = (walletEntry, currencyName) => {
    let existing = wlt.getCurrencyBalances(walletEntry, currencyName)
    let nextIndex = existing.length == 0
        ? 0
        : existing[existing.length - 1].index + 1
    let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
    let segwitAddress = bitcoreService.generateSegwitBitcoinAddress(walletEntry.secretPhrase, nextIndex)
    let legacyAddress = bitcoreService.generateBitcoinAddress(walletEntry.secretPhrase, nextIndex)
    return new Promise<WalletAddress>((resolve, reject) => {
      return selectItem(`Select desired address #${nextIndex}`,
          [["Segwit: " + segwitAddress.address, segwitAddress], ["Legacy: " + legacyAddress.address, legacyAddress]],
          item => {
            let wa: WalletAddress = { address: item.address, privateKey: item.privateKey, index: nextIndex, balance: "0", inUse: false}
            resolve(wa)
            return true
          }
      )
    })
  }


  private btcBlockExplorerService: BtcBlockExplorerService
  public symbol = 'BTC'
  public homePath
  private pendingTransactions: BitcoinPendingTransactionsService
  private bitcoinMessagesService: BitcoinMessagesService
  private user: UserService
  private recentBalance

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.btcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
    this.homePath = `/bitcoin-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('bitcoinPendingTransactions')
    this.bitcoinMessagesService = heat.$inject.get('bitcoinMessagesService')
    this.user = heat.$inject.get('user')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let self = this
    self.recentBalance = wlt.getSavedCurrencyBalance(self.address, self.symbol)
    return this.btcBlockExplorerService.getBalance(this.address).then(
      balance => {
        self.recentBalance = wlt.getSavedCurrencyBalance(self.address, self.symbol, String(balance))
        return utils.commaFormat(new Big(self.recentBalance.confirmed).div(wlt.SATOSHI_PER_BTC).toFixed(8))
      }
    ).catch(reason => {
      return utils.commaFormat(new Big(self.recentBalance.confirmed).div(wlt.SATOSHI_PER_BTC).toFixed(8))
    })
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
  invokeSendDialog = ($event) => {
    let heatService = <HeatService>heat.$inject.get('heat')
    this.sendBtc($event)
        .then(data => {
              if (data && data.txId) {
                let encryptedMessage = heat.crypto.encryptMessage(data.message, this.user.publicKey, this.user.secretPhrase)
                let timestamp = new Date().getTime()
                this.pendingTransactions.add(this.address, data.txId, timestamp)
                this.bitcoinMessagesService.add(this.address, data.txId, `${encryptedMessage.data}:${encryptedMessage.nonce}`)
                return wlt.getHeatUnavailableReason(heatService, this.user.account)
                    .then(heatUnavailableReason => wlt.paymentMemoDialog(data.txId, heatUnavailableReason))
                    .catch(reason => {
                      if (reason) console.error(reason)
                    })
              }
            },
            err => {
              if (err) {
                dialogs.alert($event, 'Send BTC Error', 'There was an error sending this transaction: ' + JSON.stringify(err))
              }
            })
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendBtc($event) {

    class FeeList {
      satByteFee = {}
      btcKByteFee = {}

      update(satByteFeesPerBlocks: {}) {
        this.fill(satByteFeesPerBlocks, 1)
        this.fill(satByteFeesPerBlocks, 3)
        this.fill(satByteFeesPerBlocks, 6)
        this.fill(satByteFeesPerBlocks, 12)
      }

      private fill(satByteFeesPerBlocks: {}, blocks: number) {
        let field = blocks.toFixed(0)
        if (satByteFeesPerBlocks[field]) {
          this.satByteFee[field] = satByteFeesPerBlocks[field]
          this.btcKByteFee[field]  = this.satByteFee[field] / 100000000 * 1024
        }
      }

    }

    let feeList = new FeeList()

    const self = this

    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {

      let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')

      const vm = this

      vm.disableOKBtn = false
      vm.stage = "create"

      vm.data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.00004540',
        message: '',
        satByteFee: 0
      }

      this.cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let createTxObject = function(isForFeeEstimation: boolean = false) {
        let user = <UserService> heat.$inject.get('user')
        let feeInSatoshi
        let amountInSatoshi
        let to
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.currency.secretPhrase}
        if (isForFeeEstimation) {
          feeInSatoshi = vm.data.fee ? (vm.data.fee * 100000000).toFixed(0) : 0
          amountInSatoshi = vm.data.amount ? (vm.data.amount * 100000000).toFixed(0) : "0.0001";
          to = vm.data.recipient ? vm.data.recipient : addressPrivateKeyPair.address
        } else {
          if (!vm.data.fee || !vm.data.amount || !vm.data.recipient) {
            return null
          }
          feeInSatoshi = (vm.data.fee * 100000000).toFixed(0);
          amountInSatoshi = (vm.data.amount * 100000000).toFixed(0);
          to = vm.data.recipient
        }

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: parseInt(amountInSatoshi),
          fee: Math.ceil(feeInSatoshi),
          changeAddress: addressPrivateKeyPair.address,
          privateKey: addressPrivateKeyPair.privateKey,
          txnFeeSatoshi: vm.data.txnFeeSatoshi
        }
        return txObject
      }

      let updateUnconfirmedBalance = function (value, fees) {
        if (!self.recentBalance) return
        let txTotal = new Big(value).plus(new Big(fees))
        let unconfirmedBalance = new Big(self.recentBalance.confirmed).minus(txTotal)
        wlt.saveCurrencyBalance(self.address, self.symbol, self.recentBalance.confirmed, unconfirmedBalance.toString())
      }

      let decodeTxn = function (rawTx: string, isCreatedTransaction = true) {
        if (!rawTx || !rawTx.trim()) return

        type DecodedTransaction = {
          transaction: any,
          decoded: {
            outs: {address: string, value: number}[]
          }
        }

        try {
          let decodedTxn: DecodedTransaction = heat.heatAppLib.BITCOIN_DECODE_TRANSACTION(rawTx)
          let outsTotal = 0
          let removeTrailZeros = /([^.])0+$/
          let reportLines = [`transaction bytes size: ${converters.hexStringToByteArray(rawTx).length}` + "\n"]
          if (isCreatedTransaction) reportLines.push(`Outgoing address: ${self.address}` + "\n")

          decodedTxn.decoded.outs.forEach(out => {
            let prefix = out.address == self.address ? "(change)" : "(recipient)"
            outsTotal += out.value
            let amount = out.value || out.value == 0
                ? (out.value / 100000000).toFixed(8).replace(removeTrailZeros, "$1")
                : ""
            reportLines.push(`${prefix}\naddress: ${out.address}`)
            if (amount) {
              reportLines.push(`value: ${out.value} (${amount} BTC)`)
            }
            reportLines.push("")
          })

          if (isCreatedTransaction) {
            let reportFee = ((self.recentBalance.confirmed - outsTotal) / 100000000).toFixed(8).replace(removeTrailZeros, "$1")
            reportLines.push(`fee: ${reportFee} BTC`)
          }
          return reportLines.join("\n").trim()
        } catch (e) {
          console.error(e)
        }
      }

      this.createButtonClick = function ($event) {
        if (!vm.data.txnFeeSatoshi) {
          vm.errorMessage = "transaction fee is not calculated"
          return
        }
        vm.report = ""
        calculateRawTx(false)?.then(rawTx => {
          if (rawTx && rawTx == vm.data.rawTx) {
            $scope.$evalAsync(() => {
              vm.report = decodeTxn(rawTx)
              vm.stage = "broadcast"
            })
          }
        }).catch(reason => console.error(reason))
      }

      this.backButtonClick = function ($event) {
        vm.report = ""
        vm.data.rawTx = ""
        vm.stage = "create"
      }

      this.insertBytesButtonClick = function ($event) {
        vm.report = ""
        vm.data.rawTx = ""
        vm.data.txnFee = ""
        vm.stage = "insertedBytes"
      }

      this.okButtonClick = function ($event) {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        vm.disableOKBtn = true
        bitcoreService.sendBitcoins(vm.data.rawTx).then(
          data => {
            let sendingResult = Object.assign(data, {paymentMessageMethod: vm.paymentMessageMethod})
            updateUnconfirmedBalance(vm.data.amount, vm.data.txnFeeSatoshi)
            $mdDialog.hide(sendingResult).then(() => {
              data.message = vm.data.message;
              dialogs.alert(event, 'Success', `TxId: ${data.txId}`);
            })
          },
          err => {
            $mdDialog.hide(null).then(() => {
              let errMessage
              if (angular.isString(err)) {
                errMessage = err
              }
              else if (angular.isObject(err) && err != null) {
                errMessage = err.message || err.error || JSON.stringify(err)
              }
              else {
                errMessage = 'Unknown reason'
              }
              errMessage = err && err.name ? (err.name + ": " + errMessage) : errMessage
              dialogs.alert(event, 'Send BTC Error', 'There was an error sending this transaction: ' +errMessage);
            })
          }
        )
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        btcBlockExplorerService.getBalance(vm.data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance
              if (info) {
                balance = (info / 100000000).toFixed(8)
                vm.data.recipientInfo = `Destination balance ${balance} BTC`
              }
              vm.data.recipientInfo = balance ? `Destination balance ${balance} BTC` : ''
            })
          },
          error => {
            $scope.$evalAsync(() => {
              vm.data.recipientInfo = (error||{}).message||'Invalid'
            })
          }
        )
      }, 1000, false)

      let calculateRawTx = function (isForFeeEstimation= true) {
        if (vm.stage == 'insertedBytes') return
        vm.errorMessage = ""
        let errorCallback = reason => {
          vm.errorMessage = "error on generation transaction bytes: " + reason
          console.log(vm.errorMessage)
        }
        vm.data.txBytes = []
        vm.data.rawTx = ''
        let tx;
        try {
          tx = createTxObject(isForFeeEstimation)
        } catch (e) {
          errorCallback(e)
        }
        if (tx) {
          let bitcoreService = <BitcoreService>heat.$inject.get('bitcoreService')
          return bitcoreService.createOneToOneTransaction(createTxObject(isForFeeEstimation), isForFeeEstimation).then(rawTx => {
            vm.data.rawTx = rawTx
            vm.data.txBytes = converters.hexStringToByteArray(rawTx)
            return rawTx
          }).catch(errorCallback)
        }
      }

      let calculateRawTxDebounced = utils.debounce(calculateRawTx, 1000, false)

      this.maxAmountClick = function() {
        if (!vm.data.txnFeeSatoshi) {
          if (vm.data.txBytes) {
            calculateTxnFee()
          } else {
            calculateRawTx()?.then(() => calculateTxnFee())
          }
          if (!vm.data.txnFeeSatoshi) {
            vm.data.amount = 0
            return
          }
        }
        let txObject = createTxObject(true)
        btcBlockExplorerService.getBalance(txObject.from, false).then(value => {
          let satoshiAmount = value - vm.data.txnFeeSatoshi
          vm.data.amount = new Big(satoshiAmount).div(wlt.SATOSHI_PER_BTC).toFixed(8)
          calculateRawTxDebounced()
        })
      }

      this.recipientChanged = function () {
        vm.data.recipientInfo = ''
        lookup()
        calculateRawTxDebounced()
      }

      this.selectedItemChange = function(item: IHeatMessageContact) {
        vm.value = vm.selectedItem ? vm.selectedItem.id : '';
        vm.data.recipient = item.cryptoAddresses ? item.cryptoAddresses.find( i => i.name === 'BTC').address : ''

        if (vm.data.recipient && vm.data.recipient !== '') {
          vm.recipientChanged()
        }
      }

      this.search = function(){
        let p = <ContactService> heat.$inject.get('contactService');
        return p.lookupContact(vm.searchText.trim())
      }

      this.searchTextChange = function() {
        vm.value = vm.searchText;
        vm.data.recipient = vm.searchText;
        vm.recipientChanged()
      }

      this.amountChanged = function () {
        calculateRawTxDebounced()
      }

      let btcFeeService: BtcFeeService = heat.$inject.get('btcFeeService')

      let calculateTxnFee = function () {
        if (vm.data.txBytes) {
          vm.data.txnFeeSatoshi = vm.data.satByteFee * vm.data.txBytes.length
          vm.data.txnFee = vm.data.txnFeeSatoshi / 100000000
        }
      }

      let loadInternetFee = function () {
        return btcFeeService.getSatByteFee().then(satByteFeesPerBlocks => {
          $scope.$evalAsync(() => {
            vm.feeList = feeList
            feeList.update(satByteFeesPerBlocks)
            if (!vm.data.satByteFee) {
              vm.data.satByteFee = feeList.satByteFee['1']
              vm.data.fee = vm.data.satByteFee / 100000000 * 1024
              calculateRawTx()?.then(() => calculateTxnFee())
            }
          })
        })
      }

      this.feeChanged = function (event) {
        calculateRawTx()?.then(() => {
          $scope.$evalAsync(() => {
            if (vm.data.fee) {
              vm.data.satByteFee = vm.data.fee * 100000000 / 1024
              calculateTxnFee()
            } else {
              vm.data.satByteFee = ''
            }
          })
        })
      }

      this.feeByteChanged = function () {
        calculateRawTx()?.then(() => {
          $scope.$evalAsync(() => {
            if (vm.data.satByteFee) {
              vm.data.fee = vm.data.satByteFee / 100000000 * 1024
              calculateTxnFee()
            } else {
              vm.data.fee = ''
            }
          })
        })
      }

      this.clearFeeByteDerived = function () {
          $scope.$evalAsync(() => {
            vm.data.fee = ''
            vm.data.txnFee = ''
            vm.data.txnFee = ''
            vm.data.rawTx = ''
          })
      }

      this.fillFeeField = function (blocks) {
        vm.data.satByteFee = feeList.satByteFee['' + blocks]
        vm.feeByteChanged()
      }

      let decodeTxnDebounced = utils.debounce(() => {
        $scope.$evalAsync(() => {
          vm.report = decodeTxn(vm.data.rawTx, false)
        })
      }, 1000, false)

      this.txnBytesChanged = function (event) {
        if (vm.stage != 'insertedBytes') return
        vm.report = ""
        decodeTxnDebounced()
      }

      //to initialize fee
      loadInternetFee()

      let $interval: angular.IIntervalService = heat.$inject.get('$interval')

      let seconds = 0
      let interval = $interval(() => {
            seconds++
            if (vm.seconds % 60 == 0) {
              loadInternetFee().then(value => seconds = 0)
            }
            vm.seconds = seconds
          },
          1000, 0, false
      )

      $scope.$on('$destroy', () => $interval.cancel(interval))

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
          <ng-form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Send BTC</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <md-autocomplete ng-if="vm.stage=='create'"
                  ng-required="true"
                  ng-readonly="false"
                  md-input-name="recipientBtcAddress"
                  md-floating-label="Recipient"
                  md-min-length="1"
                  md-items="item in vm.search(vm.searchText)"
                  md-item-text="item.publicName||item.id"
                  md-search-text="vm.searchText"
                  md-selected-item-change="vm.selectedItemChange(item)"
                  md-search-text-change="vm.searchTextChange()"
                  md-selected-item="vm.selectedItem">
                    <md-item-template>
                      <div layout="row" flex class="monospace-font">
                        <span>{{item.publicName||''}}</span>
                        <span flex></span>
                        <span>{{item.id}}</span>
                      </div>
                    </md-item-template>
                </md-autocomplete>
                
                <div ng-if="vm.stage=='create'" style="margin-top: -20px; margin-bottom: 20px">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </div>

                <md-input-container ng-if="vm.stage=='create'" flex >
                  <label>Amount in BTC</label>
                  <input ng-model="vm.data.amount" ng-change="vm.amountChanged()" required name="amount">
                  <button ng-click="vm.maxAmountClick()" aria-label="Max amount">Max amount</button>
                </md-input-container>

                <md-input-container ng-if="vm.stage=='create'">
                  <div style="margin-bottom: 12px">
                    Network fee in Sat/Byte &nbsp;&nbsp; (updated {{vm.seconds}}s ago) <br>
                    <a ng-click="vm.fillFeeField(1)">1 block: <b>{{vm.feeList.satByteFee['1']}}</b></a>
                    &nbsp;&nbsp;<a ng-click="vm.fillFeeField(3)">3 blocks: <b>{{vm.feeList.satByteFee['3']}}</b></a> 
                    &nbsp;&nbsp;<a ng-click="vm.fillFeeField(6)">6 blocks: <b>{{vm.feeList.satByteFee['6']}}</b></a> 
                    &nbsp;&nbsp;<a ng-click="vm.fillFeeField(12)">12 blocks: <b>{{vm.feeList.satByteFee['12']}}</b></a>
                  </div>
                </md-input-container>
  
                <md-input-container ng-if="vm.stage=='create'" flex>
                  <label>Fee in Sat/Byte</label>
                  <input ng-model="vm.data.satByteFee" ng-change="vm.feeByteChanged($event)" required name="feeByte">
                </md-input-container>
  
                <md-input-container ng-if="vm.stage=='create'" flex>
                  <label>Fee in BTC/kByte</label>
                  <input ng-model="vm.data.fee" ng-change="vm.feeChanged($event)" required name="fee">
                </md-input-container>
  
                <md-input-container flex ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'">
                  <label>Transaction bytes</label>
                  <textarea ng-model="vm.data.rawTx" ng-readonly="vm.stage!='insertedBytes'" ng-change="vm.txnBytesChanged($event)"
                        placeholder="paste transaction bytes in hex" 
                        rows="3"  wrap="soft" style="overflow-y: scroll;height: 130px;line-height: normal;"></textarea>
                </md-input-container>

                <md-input-container flex ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'">
                  <label>Parsed transaction bytes report</label>
                  <textarea ng-model="vm.report" readonly rows="8"  wrap="soft"
                        style="overflow-y: scroll;height: 170px;line-height: normal;"></textarea>
                </md-input-container>

              </div>
              
              <div ng-if="vm.errorMessage" class="has-error" style="color: orange;">
                {{vm.errorMessage}}
              </div>

              <div ng-if="vm.data.txnFee" class="fee" style="max-width:250px !important">
                Transaction fee <b>&nbsp;{{vm.data.txnFee || '?'}}&nbsp;</b> BTC
              </div>
              
            </md-dialog-content>

            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button class="md-warn" ng-if="vm.stage=='broadcast' || vm.stage=='insertedBytes'" ng-click="vm.backButtonClick()" aria-label="Back">Back</md-button>
              <md-button ng-if="vm.stage=='create'" ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.createButtonClick()" aria-label="Create">Create transaction</md-button>
              <md-button ng-if="vm.stage=='create'"
                  class="md-primary" ng-click="vm.insertBytesButtonClick()" aria-label="Create">Use transaction bytes</md-button>
              <md-button ng-if="vm.stage=='broadcast' || (vm.stage=='insertedBytes' && vm.report)"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="Send">Send</md-button>
            </md-dialog-actions>
          </ng-form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }

}

let selectItem = (title: string, items: any[], selectionCallback: (item) => any) => {
  let panel: PanelService = heat.$inject.get('panel')
  return panel.show(`
      <div flex style="padding: 10px; background-color: #4d5168; border-radius: 4px; font-size: larger">
        <h4>{{vm.title}}</h4>
        <md-input-container flex layout="column">
          <button ng-repeat="item in vm.items" style="padding: 16px; margin: 4px" ng-click="vm.select(item[1])" >
            {{item[0]}}
          </button>
        </md-input-container>
      </div>
    `, {
        panel: panel,
        title: title,
        items: items,
        select: (item) => {
          selectionCallback(item)
          panel.close()
        }
      }
  )
}
