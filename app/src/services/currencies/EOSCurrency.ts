class EOSCurrency implements ICurrency {

  private eosBlockExplorerService: EosBlockExplorerService;
  public symbol = 'EOS'
  public homePath
  private pendingTransactions: EosPendingTransactionsService

  private $rootScope;
  private $q;

  constructor(public masterSecretPhrase: string,
              public secretPhrase: string,
              public address: string) {
    this.homePath = `/eos-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('eosPendingTransactions')
    this.eosBlockExplorerService = heat.$inject.get('eosBlockExplorerService')
    this.$rootScope = heat.$inject.get('$rootScope')
    this.$q = heat.$inject.get('$q')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let deferred = this.$q.defer();
    this.eosBlockExplorerService.getBalance(this.address).then(data => {
      deferred.resolve(data)
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
    this.sendEOS($event).then(
      data => {
        let address = this.address
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.transaction_id, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send EOS Error', 'There was an error sending this transaction: '+JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }

  sendEOS($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      let createTxData = function (txObject) {
        return {
          actions: [
            {
              account: 'eosio.token',
              name: 'transfer',
              authorization: [
                {
                  actor: txObject.from,
                  permission: "active"
                }
              ],
              data: {
                from: txObject.from,
                to: txObject.to,
                quantity: `${txObject.amount} EOS`,
                memo: ''
              }
            }
          ]
        }
      }

      let createMeta = function() {
        return {
          blocksBehind: 3,
          expireSeconds: 30
        }
      }

      $scope['vm'].okButtonClick = function ($event) {
        const user = <UserService> heat.$inject.get('user')
        const eosBlockExplorerService = <EosBlockExplorerService> heat.$inject.get('eosBlockExplorerService')
        let to = $scope['vm'].data.recipient
        let amount = $scope['vm'].data.amount
        let userMessage = $scope['vm'].data.message
        let txObject = {
          to,
          amount,
          userMessage,
          from: user.currency.address,
          privateKey: user.currency.secretPhrase
        }
        $scope['vm'].disableOKBtn = true

        eosBlockExplorerService.sendTransaction(user.currency.secretPhrase, createTxData(txObject), createMeta()).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxId: ${data.transaction_id}`);
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

      $scope['vm'].data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        message: ''
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let eosBlockExplorerService = <EosBlockExplorerService> heat.$inject.get('eosBlockExplorerService')
        eosBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = `Balance: ${info} EOS`
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

    let deferred = $q.defer<{ transaction_id:string, fullHash: string }>()
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
              <div class="md-toolbar-tools"><h2>Send EOS</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in EOS</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <md-input-container flex >
                  <label>Message</label>
                  <input ng-model="vm.data.message" name="message">
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
