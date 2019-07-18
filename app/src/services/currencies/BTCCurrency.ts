class BTCCurrency implements ICurrency {

  private btcBlockExplorerService: BtcBlockExplorerService
  public symbol = 'BTC'
  public homePath
  private pendingTransactions: BitcoinPendingTransactionsService
  private bitcoinMessagesService: BitcoinMessagesService;
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
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
    this.sendBtc($event).then(
      data => {
        let encryptedMessage = heat.crypto.encryptMessage(data.message, this.user.publicKey, this.user.secretPhrase)
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(this.address, data.txId, timestamp)
        this.bitcoinMessagesService.add(this.address, data.txId, `${encryptedMessage.data}:${encryptedMessage.nonce}`)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send BTC Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendBtc($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let createTx = function(isForFeeEstimation: boolean = false) {
        let user = <UserService> heat.$inject.get('user')
        let feeInSatoshi
        let amountInSatoshi
        let to
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.currency.secretPhrase}
        if(!isForFeeEstimation) {
          feeInSatoshi = ($scope['vm'].data.fee * 100000000).toFixed(0);
          amountInSatoshi = ($scope['vm'].data.amount * 100000000).toFixed(0);
          to = $scope['vm'].data.recipient
        } else {
          feeInSatoshi = $scope['vm'].data.fee? ($scope['vm'].data.fee * 100000000).toFixed(0): 0
          amountInSatoshi = $scope['vm'].data.amount? ($scope['vm'].data.amount * 100000000).toFixed(0) : "0.0001";
          to = $scope['vm'].data.recipient ? $scope['vm'].data.recipient : addressPrivateKeyPair.address
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

      $scope['vm'].okButtonClick = function ($event) {
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
        fee: '0.00004540',
        message: '',
        userInputFee: false
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = (info / 100000000).toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} BTC`
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
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        $scope['vm'].data.recipientInfo = ''
        lookup()
        $scope['vm'].data.txBytes = []
        bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
          if(!$scope['vm'].data.userInputFee)
            $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        })
      }

      $scope['vm'].selectedItemChange = function(item: IHeatMessageContact) {
        $scope['vm'].value = $scope['vm'].selectedItem ? $scope['vm'].selectedItem.id : '';
        $scope['vm'].data.recipient = item.cryptoAddresses ? item.cryptoAddresses.find( i => i.name === 'BTC').address : ''

        if($scope['vm'].data.recipient && $scope['vm'].data.recipient !== '')
          $scope['vm'].recipientChanged()

      }

      $scope['vm'].search = function(){
        let p = <P2pContactUtils> heat.$inject.get('p2pContactUtils');
        return p.lookupContact($scope['vm'].searchText.trim())
      }

      $scope['vm'].searchTextChange = function() {
        $scope['vm'].value = $scope['vm'].searchText;
        $scope['vm'].data.recipient = $scope['vm'].searchText;
        $scope['vm'].recipientChanged()
      }

      $scope['vm'].amountChanged = function () {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        $scope['vm'].data.txBytes = []
        bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
          if(!$scope['vm'].data.userInputFee)
            $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        })
      }
      $scope['vm'].feeChanged = function () {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        $scope['vm'].data.txBytes = []
        bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
          $scope['vm'].data.estimatedFee = ($scope['vm'].data.fee / $scope['vm'].data.txBytes.length * 100000000).toFixed(0)
          $scope['vm'].data.userInputFee = true
        })
      }

      function getEstimatedFee() {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getEstimatedFee().then(data => {
          if(!$scope['vm'].data.userInputFee)
            $scope['vm'].data.estimatedFee = data;
        })
      }
      getEstimatedFee();
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
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Send BTC</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
            <div flex layout="column">
                <md-autocomplete flex
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
                <md-input-container flex >
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>
                <md-input-container flex >
                  <label>Amount in BTC</label>
                  <input ng-model="vm.data.amount" ng-change="vm.amountChanged()" required name="amount">
                </md-input-container>

                <md-input-container flex >
                  <label>Message</label>
                  <input ng-model="vm.data.message" name="message">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in BTC</label>
                  <input ng-model="vm.data.fee" ng-keypress="vm.feeChanged($event)" required name="fee">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <md-button ng-click="0" ng-disabled="true" class="fee" style="max-width:140px !important">Fee/Byte {{vm.data.estimatedFee}} Sat</md-button>
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
