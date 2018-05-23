class EthPendingTransactionManager {
  public entries: {[address:string]:Array<{txHash:string,timestamp:number}>} = {}
  constructor() {
    this.init()
  }

  init() {
    this.entries = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('ethPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txHash = parts[2], timestamp = parseInt(parts[3])
        this.entries[addr] = this.entries[addr] || []
        this.entries[addr].push({txHash:txHash, timestamp: timestamp});
      }
    }
  }

  add(address:string, txHash:string, timestamp: number) {
    window.localStorage.setItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`, "1")
    this.init()
  }

  remove(address:string, txHash:string, timestamp: number) {
    window.localStorage.removeItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`)
    this.init()
  }
}

// class EthPendingTransactionNotice {

//   private ethplorer: EthplorerService;
//   private $timeout: angular.ITimeoutService

//   constructor(private txHash: string) {
//     this.ethplorer = heat.$inject.get('ethplorer')
//     this.$timeout = heat.$inject.get('$timeout')
//     this.checkStatus()
//   }

//   checkStatus() {
//     this.$timeout(3000).then(() => {
//       this.ethplorer.getTxInfo(this.txHash).then(
//         info => {
//           console.log('Status got this info ==>', info)
//           this.checkStatus()
//         },
//         error => {
//           console.log('Status got ERROR ==>', error)
//           this.checkStatus()
//         }
//       )
//     })
//   }
// }

class ETHCurrency implements ICurrency {

  private ethplorer: EthplorerService
  public symbol = 'ETH'
  public homePath
  private pendingTransactions: EthereumPendingTransactionsService
  private user: UserService

  constructor(public secretPhrase: string, public address: string) {
    this.ethplorer = heat.$inject.get('ethplorer')
    this.user = heat.$inject.get('user')
    this.homePath = `/ethereum-account/${this.address}`
    this.pendingTransactions = heat.$inject.get('ethereumPendingTransactions')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.ethplorer.getBalance(this.address).then(
      balance => {
        return Number.parseFloat(balance+"").toFixed(18)
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
  invokeSendDialog($event) {
    this.sendEther($event).then(
      data => {
        let address = this.user.account
        let timestamp = new Date().getTime()
        this.pendingTransactions.add(address, data.txHash, timestamp)
      },
      err => {
        dialogs.alert($event, 'Send Ether Error', 'There was an error sending this transaction: '+JSON.stringify(err))
      }
    )
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

  sendEther($event) {
    function DialogController2($scope: angular.IScope, $mdDialog: angular.material.IDialogService) {
      $scope['vm'].cancelButtonClick = function () {
        $mdDialog.cancel()
      }
      $scope['vm'].okButtonClick = function ($event) {
        let user = <UserService> heat.$inject.get('user')
        let web3 = <Web3Service> heat.$inject.get('web3')
        let amountInWei = web3.web3.toWei($scope['vm'].data.amount.replace(',',''), 'ether')
        let from = user.currency.address
        let to = $scope['vm'].data.recipient
        web3.sendEther(from, to, amountInWei).then(
          data => {
            $mdDialog.hide(data).then(() => {
              dialogs.alert(event, 'Success', `TxHash: ${data.txHash}`);
            })
          },
          err => {
            $mdDialog.hide(null).then(() => {
              dialogs.alert(event, 'Error', err.message);
            })
          }
        )
      }
      $scope['vm'].data = {
        amount: '',
        recipient: '',
        recipientInfo: '',
        fee: '0.000420'
      }

      /* Lookup recipient info and display this in the dialog */
      let lookup = utils.debounce(function () {
        let ethplorer = <EthplorerService> heat.$inject.get('ethplorer')
        ethplorer.getAddressInfo($scope['vm'].data.recipient).then(
          info => {
            $scope.$evalAsync(() => {
              let balance = Number.parseFloat(info.ETH.balance).toFixed(18)
              $scope['vm'].data.recipientInfo = `Balance: ${balance} ETH`
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

    let deferred = $q.defer<{ txHash:string }>()
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
              <div class="md-toolbar-tools"><h2>Send Ether</h2></div>
            </md-toolbar>
            <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
              <div flex layout="column">

                <md-input-container flex >
                  <label>Recipient</label>
                  <input ng-model="vm.data.recipient" ng-change="vm.recipientChanged()" required name="recipient">
                  <span ng-if="vm.data.recipientInfo">{{vm.data.recipientInfo}}</span>
                </md-input-container>

                <md-input-container flex >
                  <label>Amount in ETH</label>
                  <input ng-model="vm.data.amount" required name="amount">
                </md-input-container>

                <p>Fee: {{vm.data.fee}} ETH</p>
              </div>
            </md-dialog-content>
            <md-dialog-actions layout="row">
              <span flex></span>
              <md-button class="md-warn" ng-click="vm.cancelButtonClick()" aria-label="Cancel">Cancel</md-button>
              <md-button ng-disabled="!vm.data.recipient || !vm.data.amount"
                  class="md-primary" ng-click="vm.okButtonClick()" aria-label="OK">OK</md-button>
            </md-dialog-actions>
          </form>
        </md-dialog>
      `
    }).then(deferred.resolve, deferred.reject);
    return deferred.promise
  }


}