class NEMCurrency implements ICurrency {

  private nemBlockExplorerService: NemBlockExplorerService;
  public symbol = 'XEM'
  public homePath
  private user: UserService;
  private pendingTransactions: NemPendingTransactionsService

  private $rootScope;
  private $q;

  constructor(public masterSecretPhrase: string,
              public secretPhrase: string,
              public address: string) {
    this.user = heat.$inject.get('user')
    this.homePath = `/nem-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('nemPendingTransactions')
    this.nemBlockExplorerService = heat.$inject.get('nemBlockExplorerService')
    this.$rootScope = heat.$inject.get('$rootScope')
    this.$q = heat.$inject.get('$q')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let deferred = this.$q.defer();
    this.nemBlockExplorerService.getAccount(this.address).then(data => {
      deferred.resolve(new Big(utils.convertToQNTf(data.account.balance.toString(), 6)).toFixed(6))
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
    this.sendXem($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.transactionHash.data, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send XEM Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }

  sendXem($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        $scope['vm'].disableOKBtn = true

        let user = <UserService> heat.$inject.get('user')
        let nemBlockExplorerService = <NemBlockExplorerService> heat.$inject.get('nemBlockExplorerService')
        let nemCryptoService = <NEMCryptoService> heat.$inject.get('nemCryptoService')
        let commonObject = nemCryptoService.getCommonObject()
        let transferTransaction = nemCryptoService.getTransferTxObject()

        commonObject.privateKey = user.secretPhrase
        transferTransaction.amount = $scope['vm'].data.amount;
        transferTransaction.recipient = $scope['vm'].data.recipient;

        let txObject = nemCryptoService.getPrepareTxObject(commonObject, transferTransaction)
        let tx = nemCryptoService.getSerializedObject(commonObject, txObject)
        let url = nemBlockExplorerService.getUrl();
        nemCryptoService.sendTx(tx, url.substr(0, url.lastIndexOf(':'))).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxId: ${data.transactionHash.data}`);
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

      let defaultFee = '0.05'
      $scope['vm'].data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: defaultFee
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let nemBlockExplorerService = <NemBlockExplorerService> heat.$inject.get('nemBlockExplorerService')
        nemBlockExplorerService.getAccount($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = new Big(utils.convertToQNTf(info.account.balance.toString(), 6)).toFixed(6)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} XEM`
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

    let deferred = $q.defer<{ transactionHash:any }>()
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
              <div class="md-toolbar-tools"><h2>Send XEM</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in XEM</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in XEM</label>
                  <input ng-model="vm.data.fee" required name="fee">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
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