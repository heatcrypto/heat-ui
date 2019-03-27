class BTCCurrency implements ICurrency {

  private btcBlockExplorerService: BtcBlockExplorerService
  public symbol = 'BTC'
  public homePath
  private pendingTransactions: BitcoinPendingTransactionsService
  private user: UserService
  private bitcoinMessagesService: BitcoinMessagesService;

  constructor(public secretPhrase: string, public address: string) {
    this.btcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/bitcoin-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('bitcoinPendingTransactions')
    this.bitcoinMessagesService = heat.$inject.get('bitcoinMessagesService')
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
        let address = this.user.account
        let privateKey = this.user.secretPhrase
        let publicKey = this.user.publicKey
        let encryptedMessage = heat.crypto.encryptMessage(data.message, publicKey, privateKey)
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txId, timestamp)
        this.bitcoinMessagesService.add(address, data.txId, `${encryptedMessage.data}:${encryptedMessage.nonce}`)
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
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')

        let amountInSatoshi = $scope['vm'].data.amount * 100000000;
        let feeInSatoshi
        if(!isForFeeEstimation)
          feeInSatoshi = $scope['vm'].data.fee * 100000000;
        else
          feeInSatoshi = 0
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.secretPhrase}
        let to = $scope['vm'].data.recipient

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: amountInSatoshi,
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
        message: ''
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
          $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        })
      }

      $scope['vm'].amountChanged = function () {
        let bitcoreService = <BitcoreService> heat.$inject.get('bitcoreService')
        $scope['vm'].data.txBytes = []
        bitcoreService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
          $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        })
      }

      function getEstimatedFee() {
        let btcBlockExplorerService = <BtcBlockExplorerService> heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getEstimatedFee().then(data => {
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

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
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
                  <input ng-model="vm.data.fee" required name="fee">
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