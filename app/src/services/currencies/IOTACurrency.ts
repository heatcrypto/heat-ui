class IOTACurrency implements ICurrency {

  private iotaBlockExplorerService: IotaBlockExplorerService;
  public symbol = 'IOTA'
  public homePath
  private user: UserService;
  private pendingTransactions: IotaPendingTransactionsService

  private $rootScope;
  private $q;

  constructor(public secretPhrase: string,
              public address: string) {
    this.iotaBlockExplorerService = heat.$inject.get('iotaBlockExplorerService')
    this.user = heat.$inject.get('user')
    this.homePath = `/iota-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('iotaPendingTransactions')

    this.$rootScope = heat.$inject.get('$rootScope')
    this.$q = heat.$inject.get('$q')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    let deferred = this.$q.defer();
    this.iotaBlockExplorerService.getAccountInfo(this.secretPhrase).then(info => {
      deferred.resolve(info.balance.toString())
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
    this.sendIota($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data[0].hash, timestamp)
      },
      err => {
        if (err) {
          dialogs.alert($event, 'Send IOTA Error', 'There was an error sending this transaction: ' + JSON.stringify(err))
        }
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }

  sendIota($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let iotaBlockExplorerService = <IotaBlockExplorerService>heat.$inject.get('iotaBlockExplorerService')
        let user = <UserService>heat.$inject.get('user')

        $scope['vm'].disableOKBtn = true
        const transfers = [{
            address: $scope['vm'].data.recipient,
            value: parseInt($scope['vm'].data.value)
          }]
        iotaBlockExplorerService.sendIota(user.secretPhrase, transfers).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `Bundle: ${data[0].hash}`);
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
        value: '',
        recipient: '',
        recipientInfo: '',
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let iotaBlockExplorerService = <IotaBlockExplorerService>heat.$inject.get('iotaBlockExplorerService')
        iotaBlockExplorerService.getBalance($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = new Big(info).toFixed(0);
              $scope['vm'].data.recipientInfo = `Balance: ${balance} IOTA`
            })
          },
          error => {
            $scope.$evalAsync(() => {
              $scope['vm'].data.recipientInfo = error.message || 'Invalid'
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
    let $mdDialog = <angular.material.IDialogService>heat.$inject.get('$mdDialog')

    let deferred = $q.defer<any>()
    $mdDialog.show({
      controller: DialogController2,
      parent: angular.element(document.body),
      targetEvent: $event,
      clickOutsideToClose: false,
      controllerAs: 'vm',
      template: `
        <md-dialog>
          <form name="dialogForm">
            <md-toolbar>
              <div class="md-toolbar-tools"><h2>Send IOTA</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">
                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in IOTA</label>
                  <input ng-model="vm.data.value" required name="amount">
                </md-input-container>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.value || vm.disableOKBtn"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }
}
