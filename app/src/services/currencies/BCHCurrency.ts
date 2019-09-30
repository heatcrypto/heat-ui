class BCHCurrency implements ICurrency {

  private bchBlockExplorerService: BchBlockExplorerService
  public symbol = 'BCH'
  public homePath
  private pendingTransactions: BchPendingTransactionsService
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.bchBlockExplorerService = heat.$inject.get('bchBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/bitcoin-cash-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('bchPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.bchBlockExplorerService.getBalance(this.address).then(
      balance => {
        let balanceUnconfirmed = parseFloat(balance) / 100000000;
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
    this.sendBch($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txId, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send BCH Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendBch($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let createTx = function(isForFeeEstimation: boolean = false) {
        let user = <UserService> heat.$inject.get('user')
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.secretPhrase}
        let amountInSatoshi = $scope['vm'].data.amount * 100000000 === 0 ? 10000 : parseInt(($scope['vm'].data.amount * 100000000).toFixed(0));
        let feeInSatoshi = $scope['vm'].data.fee * 100000000 === 0 ? 1000 : parseInt(($scope['vm'].data.fee * 100000000).toFixed(0));
        let to = $scope['vm'].data.recipient

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: amountInSatoshi,
          fee: feeInSatoshi,
          changeAddress: addressPrivateKeyPair.address,
          privateKey: addressPrivateKeyPair.privateKey
        }
        return txObject
      }

      $scope['vm'].okButtonClick = function ($event) {
        let bchCryptoService = <BCHCryptoService> heat.$inject.get('bchCryptoService')
        $scope['vm'].disableOKBtn = true
        bchCryptoService.sendBitcoinCash(createTx()).then(
          data => {
            $mdDialog.hide(data).then(() => {
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
        fee: '0.00001'
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let bchBlockExplorerService = <BchBlockExplorerService> heat.$inject.get('bchBlockExplorerService')
        bchBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = (parseFloat(info) / 100000000).toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} BCH`
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
        // let bchCryptoService = <BCHCryptoService> heat.$inject.get('bchCryptoService')
        $scope['vm'].data.recipientInfo = ''
        lookup()
        // $scope['vm'].data.txBytes = []
        // bchCryptoService.signTransaction(createTx(true), true).then(rawTx => {
        //   $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
        //   $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        // })
      }

      $scope['vm'].amountChanged = function () {
        let bchCryptoService = <BCHCryptoService> heat.$inject.get('bchCryptoService')
        $scope['vm'].data.txBytes = []
        bchCryptoService.signTransaction(createTx(true), true).then(rawTx => {
          $scope['vm'].data.txBytes = converters.hexStringToByteArray(rawTx)
          $scope['vm'].data.fee = $scope['vm'].data.txBytes.length * $scope['vm'].data.estimatedFee / 100000000
        })
      }

      function getEstimatedFee() {
        let bchBlockExplorerService = <BchBlockExplorerService> heat.$inject.get('bchBlockExplorerService')
        bchBlockExplorerService.getEstimatedFee().then(fee => {
          $scope['vm'].data.fee = fee || $scope['vm'].data.fee;
        })
      }
      getEstimatedFee();
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
              <div class="md-toolbar-tools"><h2>Send BCH</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in BCH</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in BCH</label>
                  <input ng-model="vm.data.fee" required name="fee">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <md-button ng-click="0" ng-disabled="true" class="fee" style="max-width:140px !important">Fee {{vm.data.fee}} BCH</md-button>
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
