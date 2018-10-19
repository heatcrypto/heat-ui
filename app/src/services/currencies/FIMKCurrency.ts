class FIMKCurrency implements ICurrency {

  private mofoSocketService: MofoSocketService;
  public symbol = 'FIM'
  public homePath
  private user: UserService;
  private pendingTransactions: FimkPendingTransactionsService

  private $rootScope;
  private $q;

  constructor(public secretPhrase: string,
              public address: string) {
    this.mofoSocketService = heat.$inject.get('mofoSocketService')
    this.user = heat.$inject.get('user')
    this.homePath = `/fimk-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('fimkPendingTransactions')

    this.$rootScope = heat.$inject.get('$rootScope')
    this.$q = heat.$inject.get('$q')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let deferred = this.$q.defer();
    this.mofoSocketService.getAccount(this.address).then(formattedBalance => {
      deferred.resolve(formattedBalance)
    }, err => {
      deferred.reject();
    })
    return deferred.promise;
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: () => void): () => void {
    return
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {
    /* Ignore this since not needed for HEAT */
  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {
    this.sendFim($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txId, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send FIM Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }

  sendFim($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let user = <UserService> heat.$inject.get('user')
        let fimkCryptoService = <FIMKCryptoService> heat.$inject.get('fimkCryptoService')
        let mofoSocketService = <MofoSocketService> heat.$inject.get('mofoSocketService')

        let to = $scope['vm'].data.recipient

        let txObject = {
          recipient: to,
          amountNQT: utils.convertToNQT(String($scope['vm'].data.amountNQT)),
          feeNQT: utils.convertToNQT(String($scope['vm'].data.feeNQT)),
          publicKey: fimkCryptoService.getPublicKey(user.secretPhrase),
          deadline: '1440',
          requestType: 'sendMoney'
        }

        $scope['vm'].disableOKBtn = true
        mofoSocketService.sendFim(txObject).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxId: ${data.txId}`);
            })
          },
          err => {
            $mdDialog.hide(null).then(() => {
              dialogs.alert(event, 'Error', err);
            })
          }
        )
      }
      $scope['vm'].disableOKBtn = false

      let defaultFee = '0.1'
      $scope['vm'].data = {
        amountNQT: '',
        recipient: '',
        recipientInfo: '',
        feeNQT: defaultFee
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let mofoSocketService = <MofoSocketService> heat.$inject.get('mofoSocketService')
        mofoSocketService.getAccount($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = new Big(info).toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} FIM`
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
              <div class="md-toolbar-tools"><h2>Send FIM</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in FIM</label>
                  <input ng-model="vm.data.amountNQT" required name="amount">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in FIM</label>
                  <input ng-model="vm.data.feeNQT" required name="fee">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amountNQT || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }
}