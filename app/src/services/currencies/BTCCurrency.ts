class BTCCurrency implements ICurrency {

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

      const vm = this

      vm.disableOKBtn = false

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

      let createTx = function(isForFeeEstimation: boolean = false) {
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
          privateKey: addressPrivateKeyPair.privateKey
        }
        return txObject
      }

      let updateUnconfirmedBalance = function (value, fees) {
        if (!self.recentBalance) return
        let txTotal = new Big(value).plus(new Big(fees))
        let unconfirmedBalance = new Big(self.recentBalance.confirmed).minus(txTotal)
        wlt.saveCurrencyBalance(self.address, self.symbol, self.recentBalance.confirmed, unconfirmedBalance.toString())
      }

      this.okButtonClick = function ($event) {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        vm.disableOKBtn = true
        bitcoreService.sendBitcoins(createTx()).then(
          data => {
            let sendingResult = Object.assign(data, {paymentMessageMethod: vm.paymentMessageMethod})
            updateUnconfirmedBalance(vm.data.amount, vm.data.fee)
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
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
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

      let calculateRawTx = function () {
        let bitcoreService = <BitcoreService>heat.$inject.get('bitcoreService')
        let errorCallback = reason => console.log("error on generation transaction bytes: " + reason);
        vm.data.txBytes = []
        let result = bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          vm.data.txBytes = converters.hexStringToByteArray(rawTx)
        }).catch(errorCallback)

        //try to calculate raw txn
        vm.data.rawTx = ''
        let tx;
        try {
          tx = createTx(false)
        } catch (e) {
        }
        if (tx) {
          bitcoreService.signTransaction(tx).then(rawTx => {
            vm.data.rawTx = rawTx
          }).catch(errorCallback)
        }

        return result
      }

      let calculateRawTxDebounced = utils.debounce(calculateRawTx, 1000)

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
        calculateRawTx()
      }

      let btcFeeService: BtcFeeService = heat.$inject.get('btcFeeService')

      let loadInternetFee = function () {
        return btcFeeService.getSatByteFee().then(satByteFeesPerBlocks => {
          $scope.$evalAsync(() => {
            vm.feeList = feeList
            feeList.update(satByteFeesPerBlocks)
            if (!vm.data.satByteFee) {
              vm.data.satByteFee = feeList.satByteFee['1']
              vm.data.fee = vm.data.satByteFee / 100000000 * 1024
            }
          })
        })
      }

      this.feeChanged = function (event) {
        calculateRawTx().then(() => {
          $scope.$evalAsync(() => {
            // if (!vm.data.fee) {
            //   loadInternetFee()
            // }
            if (vm.data.fee) {
              vm.data.satByteFee = vm.data.fee * 100000000 / 1024
              if (vm.data.txBytes) {
                vm.data.txnFee = (vm.data.satByteFee * vm.data.txBytes.length / 100000000)
              }
            } else {
              vm.data.satByteFee = ''
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

      this.feeByteChanged = function () {

        calculateRawTx().then(() => {
          $scope.$evalAsync(() => {
            if (vm.data.satByteFee) {
              vm.data.fee = vm.data.satByteFee / 100000000 * 1024
              if (vm.data.txBytes) {
                vm.data.txnFee = (vm.data.satByteFee * vm.data.txBytes.length / 100000000)
              }
            } else {
              vm.data.fee = ''
            }
          })
        })
      }

      this.fillFeeField = function (blocks) {
        vm.data.satByteFee = feeList.satByteFee['' + blocks]
        vm.feeByteChanged()
      }

      //to initialize fee
      loadInternetFee().then(value => vm.feeChanged())

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
                <md-autocomplete
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
                <div style="margin-top: -20px; margin-bottom: 20px">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </div>

                <md-input-container flex >
                  <label>Amount in BTC</label>
                  <input ng-model="vm.data.amount" ng-change="vm.amountChanged()" required name="amount">
                </md-input-container>

              <md-input-container>
              <div style="margin-bottom: 12px">
                Network fee in Sat/Byte &nbsp;&nbsp; (updated {{vm.seconds}}s ago) <br>
                <a ng-click="vm.fillFeeField(1)">1 block: <b>{{vm.feeList.satByteFee['1']}}</b></a>
                &nbsp;&nbsp;<a ng-click="vm.fillFeeField(3)">3 blocks: <b>{{vm.feeList.satByteFee['3']}}</b></a> 
                &nbsp;&nbsp;<a ng-click="vm.fillFeeField(6)">6 blocks: <b>{{vm.feeList.satByteFee['6']}}</b></a> 
                &nbsp;&nbsp;<a ng-click="vm.fillFeeField(12)">12 blocks: <b>{{vm.feeList.satByteFee['12']}}</b></a>
              </div>
              </md-input-container>

              <md-input-container flex>
                <label>Fee in Sat/Byte</label>
                <input ng-model="vm.data.satByteFee" ng-change="vm.feeByteChanged($event)" required name="feeByte">
              </md-input-container>

              <md-input-container flex>
                <label>Fee in BTC/kByte</label>
                <input ng-model="vm.data.fee" ng-change="vm.feeChanged($event)" required name="fee">
              </md-input-container>

              <md-input-container flex ng-if="vm.data.rawTx">
                <label>Transaction bytes</label>
                <textarea ng-model="vm.data.rawTx" readonly rows="3"  wrap="soft"
                      style="overflow-y: scroll;max-height: 50px;line-height: normal;"></textarea>
              </md-input-container>

              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">

              <div ng-if="vm.data.txnFee" class="fee" style="max-width:250px !important">
                Transaction fee <b>&nbsp;{{vm.data.txnFee || '?'}}&nbsp;</b> BTC
              </div>

              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="Send now">Send now</md-button>
            </md-dialog-actions>
          </ng-form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }

}
