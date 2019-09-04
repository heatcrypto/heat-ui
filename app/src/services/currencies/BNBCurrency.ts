class BNBCurrency implements ICurrency {

  private bnbBlockExplorerService: BnbBlockExplorerService
  public symbol = 'BNB'
  public homePath
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.bnbBlockExplorerService = heat.$inject.get('bnbBlockExplorerService')
    this.homePath = `/binance-account/${this.address}`
    this.user = heat.$inject.get('user')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.bnbBlockExplorerService.getBalance(this.address).then(
      balance => {
        return utils.commaFormat(balance.toFixed(8))
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
    this.send($event).then(
      data => {
        let timestamp = new Date().getTime()
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send BNB Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  send($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }

      let createTx = function() {
        let user = <UserService> heat.$inject.get('user')
        let feeInBnb = parseFloat($scope['vm'].data.fee).toFixed(8);
        let amountInBnb = parseFloat($scope['vm'].data.amount).toFixed(8);
        let to = $scope['vm'].data.recipient
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.currency.secretPhrase}

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: amountInBnb,
          fee: feeInBnb,
          privateKey: addressPrivateKeyPair.privateKey,
          message: $scope['vm'].data.message
        }
        return txObject
      }

      $scope['vm'].okButtonClick = function ($event) {
        let bnbCryptoService = <BNBCryptoService> heat.$inject.get('bnbCryptoService')
        $scope['vm'].disableOKBtn = true
        bnbCryptoService.sendBinanceCoins(createTx()).then(
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
        fee: '',
        message: ''
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let bnbBlockExplorerService = <BnbBlockExplorerService> heat.$inject.get('bnbBlockExplorerService')
        bnbBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = info.toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} BNB`
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
        $scope['vm'].data.recipientInfo = ''
        lookup()
      }

      function getEstimatedFee() {
        let bnbBlockExplorerService = <BnbBlockExplorerService> heat.$inject.get('bnbBlockExplorerService')
        bnbBlockExplorerService.getEstimatedFee().then(data => {
          $scope['vm'].data.fee = data;
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
            <div class="md-toolbar-tools"><h2>Send BNB</h2></div>
          </md-toolbar>
          <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
          <div flex layout="column">
              <md-input-container flex >
                <label>Recipient</label>
                <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
              </md-input-container>

              <md-input-container flex >
                <label>Amount in BNB</label>
                <input ng-model="vm.data.amount" required name="amount">
              </md-input-container>

              <md-input-container flex >
                <label>Message</label>
                <input ng-model="vm.data.message" name="message">
              </md-input-container>
            </div>
          </md-dialog-content>
          <md-dialog-actions layout="row">
            <md-button ng-click="0" ng-disabled="true" class="fee" style="max-width:145px !important">Fee {{vm.data.fee}} BNB</md-button>
            <span flex></span>
            <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
            <md-button ng-disabled="!vm.data.recipient || !vm.data.amount || vm.disableOKBnb"
                class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
          </md-dialog-actions>
        </form>
      </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }
}
