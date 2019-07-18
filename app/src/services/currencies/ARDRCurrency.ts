class ARDRCurrency implements ICurrency {

  private ardorBlockExplorerService: ArdorBlockExplorerService;
  public symbol = 'ARDR'
  public homePath
  private pendingTransactions: ArdorPendingTransactionsService

  private $rootScope;
  private $q;

  constructor(public masterSecretPhrase: string,
              public secretPhrase: string,
              public address: string) {
    this.homePath = `/ardor-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('ardorPendingTransactions')
    this.ardorBlockExplorerService = heat.$inject.get('ardorBlockExplorerService')
    this.$rootScope = heat.$inject.get('$rootScope')
    this.$q = heat.$inject.get('$q')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let deferred = this.$q.defer();
    this.ardorBlockExplorerService.getBalance(this.address).then(data => {
      deferred.resolve(new Big(utils.convertToQNTf(data)).toFixed(8))
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
    this.sendArdr($event).then(
      data => {
        let address = this.address
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txId, timestamp, data.fullHash)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send ARDR Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }

  sendArdr($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let user = <UserService> heat.$inject.get('user')
        let ardorBlockExplorerService = <ArdorBlockExplorerService> heat.$inject.get('ardorBlockExplorerService')

        let to = $scope['vm'].data.recipient
        let amountNQT = utils.convertToNQT(String($scope['vm'].data.amountNQT))
        let feeNQT = utils.convertToNQT(String($scope['vm'].data.feeNQT))
        let recipientPublicKey;
        let txObject;
        if($scope['vm'].data.recipientPublicKey) {
          recipientPublicKey = converters.hexStringToByteArray($scope['vm'].data.recipientPublicKey)
        }
        let userMessage = $scope['vm'].data.message
        if(userMessage && userMessage != '' && recipientPublicKey) {
          let options: heat.crypto.IEncryptOptions = {
            "publicKey": recipientPublicKey
          };
          let encryptedNote = heat.crypto.encryptNote(userMessage, options, user.currency.secretPhrase)
          txObject = `nxt?requestType=sendMoney&secretPhrase=${user.currency.secretPhrase}&recipient=${to}&amountNQT=${amountNQT}&feeNQT=${feeNQT}&deadline=60&encryptedMessageData=${encryptedNote.message}&encryptedMessageNonce=${encryptedNote.nonce}&messageToEncryptIsText=true&encryptedMessageIsPrunable=true&chain=1`;
        }
        else {
          txObject = `nxt?requestType=sendMoney&secretPhrase=${user.currency.secretPhrase}&recipient=${to}&amountNQT=${amountNQT}&feeNQT=${feeNQT}&deadline=60&chain=1`;
        }
        $scope['vm'].disableOKBtn = true
        ardorBlockExplorerService.sendTransactionWithSecret(txObject).then(
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

      let defaultFee = '1.0'
      $scope['vm'].data = {
        amountNQT: '',
        recipient: '',
        recipientInfo: '',
        feeNQT: defaultFee,
        message: ''
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let ardorBlockExplorerService = <ArdorBlockExplorerService> heat.$inject.get('ardorBlockExplorerService')
        ardorBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = new Big(utils.convertToQNTf(info)).toFixed(8)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} ARDR`
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = error.message||'Invalid'
            })
          }
        )
        ardorBlockExplorerService.getPublicKeyFromAddress($scope['vm'].data.recipient).then(
          publicKey => {
            $scope['vm'].data.recipientPublicKey = publicKey;
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

    let deferred = $q.defer<{ txId:string, fullHash: string }>()
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
              <div class="md-toolbar-tools"><h2>Send ARDR</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in ARDR</label>
                  <input ng-model="vm.data.amountNQT" required name="amount">
                </md-input-container>

                <md-input-container flex >
                  <label>Message</label>
                  <input ng-model="vm.data.message" name="message">
                </md-input-container>

                <md-input-container flex>
                  <label>Fee in ARDR</label>
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
