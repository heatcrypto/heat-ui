class BTCCurrency implements ICurrency {

  private btcBlockExplorerService: BtcBlockExplorerService
  public symbol = 'BTC'
  public homePath
  private pendingTransactions: BitcoinPendingTransactionsService
  private bitcoinMessagesService: BitcoinMessagesService
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string,
              private postAction?: (txId: string, message: string) => Promise<any>) {
    this.btcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
    this.homePath = `/bitcoin-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('bitcoinPendingTransactions')
    this.bitcoinMessagesService = heat.$inject.get('bitcoinMessagesService')
    this.user = heat.$inject.get('user')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.btcBlockExplorerService.getBalance(this.address).then(
      balance => {
        let balanceUnconfirmed = balance / 100000000;
        return utils.commaFormat(new Big(balanceUnconfirmed+"").toFixed(8))
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
  invokeSendDialog = ($event) => {
    let heatService = <HeatService> heat.$inject.get('heat')
    wlt.getHeatUnavailableReason(heatService, this.user.account)
        .then(heatUnavailableReason => this.sendBtc($event, heatUnavailableReason))
        .then(
            data => {
              if (data != null) {
                let encryptedMessage = heat.crypto.encryptMessage(data.message, this.user.publicKey, this.user.secretPhrase)
                let timestamp = new Date().getTime()
                this.pendingTransactions.add(this.address, data.txId, timestamp)
                this.bitcoinMessagesService.add(this.address, data.txId, `${encryptedMessage.data}:${encryptedMessage.nonce}`)
              }
              return data
            },
            err => {
              if (err) {
                dialogs.alert($event, 'Send BTC Error', 'There was an error sending this transaction: ' + JSON.stringify(err))
              }
            }
        ).then(
        transactionResult => {
          if (!transactionResult) return
          this.postAction(transactionResult.txId, transactionResult.message).then(
              v => console.log("BTC sending post action is performed " + v),
              reason => dialogs.alert($event, 'BTC sending post action is not performed', reason)
          ).catch(reason => dialogs.alert($event, 'BTC sending post action error', reason))
        }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendBtc($event, heatUnavailableReason) {

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

    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {

      this.heatUnavailableReason = heatUnavailableReason.description
          || heatUnavailableReason.data?.errorDescription
          || heatUnavailableReason

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
          feeInSatoshi = $scope['vm'].data.fee ? ($scope['vm'].data.fee * 100000000).toFixed(0) : 0
          amountInSatoshi = $scope['vm'].data.amount ? ($scope['vm'].data.amount * 100000000).toFixed(0) : "0.0001";
          to = $scope['vm'].data.recipient ? $scope['vm'].data.recipient : addressPrivateKeyPair.address
        } else {
          if (!$scope['vm'].data.fee || !$scope['vm'].data.amount || !$scope['vm'].data.recipient) {
            return null
          }
          feeInSatoshi = ($scope['vm'].data.fee * 100000000).toFixed(0);
          amountInSatoshi = ($scope['vm'].data.amount * 100000000).toFixed(0);
          to = $scope['vm'].data.recipient
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

      this.okButtonClick = function ($event) {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        $scope['vm'].disableOKBtn = true
        bitcoreService.sendBitcoins(createTx()).then(
          data => {
            $mdDialog.hide(data).then(() => {
              data.message = $scope['vm'].data.message;
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
      this.disableOKBtn = false
      this.data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.00004540',
        message: '',
        satByteFee: 0
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance
              if (info) {
                balance = (info / 100000000).toFixed(8)
                $scope['vm'].data.recipientInfo = `Destination balance ${balance} BTC`
              }
              $scope['vm'].data.recipientInfo = balance ? `Destination balance ${balance} BTC` : ''
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = (error||{}).message||'Invalid'
            })
          }
        )
      }, 1000, false)

      let calculateRawTx = function () {
        let bitcoreService = <BitcoreService>heat.$inject.get('bitcoreService')
        let errorCallback = reason => console.log("error on generation transaction bytes: " + reason);
        $scope['vm'].data.txBytes = []
        let result = bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
        }).catch(errorCallback)

        //try to calculate raw txn
        $scope['vm'].data.rawTx = ''
        let tx;
        try {
          tx = createTx(false)
        } catch (e) {
        }
        if (tx) {
          bitcoreService.signTransaction(tx).then(rawTx => {
            $scope['vm'].data.rawTx = rawTx
          }).catch(errorCallback)
        }

        return result
      }

      let calculateRawTxDebounced = utils.debounce(calculateRawTx, 1000)

      this.recipientChanged = function () {
        $scope['vm'].data.recipientInfo = ''
        lookup()
        calculateRawTxDebounced()
      }

      this.selectedItemChange = function(item: IHeatMessageContact) {
        $scope['vm'].value = $scope['vm'].selectedItem ? $scope['vm'].selectedItem.id : '';
        $scope['vm'].data.recipient = item.cryptoAddresses ? item.cryptoAddresses.find( i => i.name === 'BTC').address : ''

        if ($scope['vm'].data.recipient && $scope['vm'].data.recipient !== '') {
          $scope['vm'].recipientChanged()
        }
      }

      this.search = function(){
        let p = <ContactService> heat.$inject.get('contactService');
        return p.lookupContact($scope['vm'].searchText.trim())
      }

      this.searchTextChange = function() {
        $scope['vm'].value = $scope['vm'].searchText;
        $scope['vm'].data.recipient = $scope['vm'].searchText;
        $scope['vm'].recipientChanged()
      }

      this.amountChanged = function () {
        calculateRawTx()
      }

      let btcFeeService: BtcFeeService = heat.$inject.get('btcFeeService')

      let loadInternetFee = function () {
        return btcFeeService.getSatByteFee().then(satByteFeesPerBlocks => {
          $scope.$evalAsync(() => {
            $scope['vm'].feeList = feeList
            feeList.update(satByteFeesPerBlocks)
            if (!$scope['vm'].data.satByteFee) {
              $scope['vm'].data.satByteFee = feeList.satByteFee['1']
              $scope['vm'].data.fee = $scope['vm'].data.satByteFee / 100000000 * 1024
            }
          })
        })
      }

      this.feeChanged = function (event) {
        calculateRawTx().then(() => {
          $scope.$evalAsync(() => {
            // if (!$scope['vm'].data.fee) {
            //   loadInternetFee()
            // }
            if ($scope['vm'].data.fee) {
              $scope['vm'].data.satByteFee = $scope['vm'].data.fee * 100000000 / 1024
              if ($scope['vm'].data.txBytes) {
                $scope['vm'].data.txnFee = ($scope['vm'].data.satByteFee * $scope['vm'].data.txBytes.length / 100000000)
              }
            } else {
              $scope['vm'].data.satByteFee = ''
            }
          })
        })
      }

      this.clearFeeByteDerived = function () {
          $scope.$evalAsync(() => {
            $scope['vm'].data.fee = ''
            $scope['vm'].data.txnFee = ''
            $scope['vm'].data.txnFee = ''
            $scope['vm'].data.rawTx = ''
          })
      }

      this.feeByteChanged = function () {
        calculateRawTx().then(() => {
          $scope.$evalAsync(() => {
            if ($scope['vm'].data.satByteFee) {
              $scope['vm'].data.fee = $scope['vm'].data.satByteFee / 100000000 * 1024
              if ($scope['vm'].data.txBytes) {
                $scope['vm'].data.txnFee = ($scope['vm'].data.satByteFee * $scope['vm'].data.txBytes.length / 100000000)
              }
            } else {
              $scope['vm'].data.fee = ''
            }
          })
        })
      }

      this.fillFeeField = function (blocks) {
        $scope['vm'].data.satByteFee = feeList.satByteFee['' + blocks]
        $scope['vm'].feeByteChanged()
      }

      //to initialize fee
      loadInternetFee().then(value => $scope['vm'].feeChanged())

      let $interval: angular.IIntervalService = heat.$inject.get('$interval')

      let seconds = 0
      let interval = $interval(() => {
            seconds++
            if ($scope['vm'].seconds % 60 == 0) {
              loadInternetFee().then(value => seconds = 0)
            }
            $scope['vm'].seconds = seconds
          },
          1000, 0, false
      )

      $scope.$on('$destroy', () => $interval.cancel(interval))

    }

    let $q = heat.$inject.get('$q')
    let $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog')

    let deferred = $q.defer<{ txId:string, message: string }>()
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

                <md-input-container flex style="margin-bottom: 14px">
                  <label>Payment message / memo (encrypted)</label>
                  <input ng-model="vm.data.message" name="message" ng-disabled="!vm.paymentMessageMethod">
                  <div>Store message on:</div>
                  <md-radio-group ng-model="vm.paymentMessageMethod" layout="row" style="margin-left: 10px;">
                    <md-radio-button value="0" >This device</md-radio-button>
                    <md-radio-button value="1" ng-disabled="vm.heatUnavailableReason">Heat blockchain</md-radio-button>
                    <span ng-if="vm.heatUnavailableReason" style="color: grey"> &nbsp;&nbsp;({{vm.heatUnavailableReason}})</span>
                  </md-radio-group>
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
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </ng-form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }

}
