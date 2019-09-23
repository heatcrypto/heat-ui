class ZECCurrency implements ICurrency {

  private zecBlockExplorerService: ZecBlockExplorerService
  public symbol = 'ZEC'
  public homePath
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.zecBlockExplorerService = heat.$inject.get('zecBlockExplorerService')
    this.homePath = `/zcash-account/${this.address}`
    this.user = heat.$inject.get('user')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.zecBlockExplorerService.getBalance(this.address).then(
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
          dialogs.alert($event, 'Send ZEC Error', 'There was an error sending this transaction: '+JSON.stringify(err))
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
        let addressPrivateKeyPair = {address: user.currency.address, privateKey: user.currency.secretPhrase};
        let to = $scope['vm'].data.recipient ? $scope['vm'].data.recipient : addressPrivateKeyPair.address;
        let feeInSatoshi = ($scope['vm'].data.fee * 100000000).toFixed(0);
        let amountInSatoshi = ($scope['vm'].data.amount * 10000000).toFixed(0);

        let txObject = {
          from: addressPrivateKeyPair.address,
          to: to,
          amount: parseInt(amountInSatoshi),
          fee: parseInt(feeInSatoshi),
          changeAddress: addressPrivateKeyPair.address,
          privateKey: addressPrivateKeyPair.privateKey
        }
        return txObject
      }

      $scope['vm'].okButtonClick = function ($event) {
        let zecCryptoService = <ZECCryptoService> heat.$inject.get('zecCryptoService')
        $scope['vm'].disableOKBtn = true
        zecCryptoService.sendZcash(createTx()).then(
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
        fee: '0.0001'
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let zecBlockExplorerService = <ZecBlockExplorerService> heat.$inject.get('zecBlockExplorerService')
        zecBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = info.toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} ZEC`
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
    }

    let $q = heat.$inject.get('$q')
    let $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog')

    let deferred = $q.defer<{ txId:string}>()
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
              <div class="md-toolbar-tools"><h2>Send ZEC</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in ZEC</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in ZEC</label>
                  <input ng-model="vm.data.fee" required name="fee" readonly>
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <md-button ng-click="0" ng-disabled="true" class="fee" style="max-width:140px !important">Fee {{vm.data.fee}} ZEC</md-button>
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
