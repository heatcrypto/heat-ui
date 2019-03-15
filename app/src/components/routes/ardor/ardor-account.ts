@RouteConfig('/ardor-account/:account')
@Component({
  selector: 'ardorAccount',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Address:
            </div>
            <div class="value">
              <a href="#/ardor-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} ARDR
            </div>
          </div>
        </div>
        <div layout="column">
          <div class="col-item">
            <div class="title">
              ARDOR Server:
            </div>
            <div class="value">
              <md-select class="md-select-ws" ng-model="vm.selectSocketEndPoint" ng-change="vm.changeSocketAddress()">
                <md-option ng-repeat="socket in vm.sockets" value="{{socket.name}}">{{socket.name}}</md-option>
              </md-select>
            </div>
          </div>
        </div>
      </div>

      <div flex layout="column">
        <div layout="column" ng-if="vm.pendingTransactions.length">
          <div layout="row" class="trader-component-title">Pending Transactions</div>
          <md-list flex layout-fill layout="column">
            <md-list-item class="header">
              <div class="truncate-col date-col left">Time</div>
              <div class="truncate-col id-col left">Status</div>
              <div class="truncate-col info-col left" flex>Transaction Id</div>
            </md-list-item>
            <md-list-item ng-repeat="item in vm.pendingTransactions" class="row">
              <div class="truncate-col date-col left">{{item.date}}</div>
              <div class="truncate-col id-col left">
                Pending&nbsp;<elipses-loading></elipses-loading>
              </div>
              <div class="truncate-col info-col left" flex>
                <span>{{item.txId}}</span>
              </div>
            </md-list-item>
          </md-list>
          <p></p>
        </div>
        <virtual-repeat-ardor-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-ardor-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'ardorBlockExplorerService', 'ardorPendingTransactions', '$interval', '$mdToast', 'settings', 'user')
class ArdorAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;
  pendingTransactions: Array<{ date: string, txId: string, time: number, address: string, fullHash: string }> = []
  prevIndex = 0
  busy = true
  sockets: any;

  constructor(private $scope: angular.IScope,
              private ardorBlockExplorerService: ArdorBlockExplorerService,
              private ardorPendingTransactions: ArdorPendingTransactionsService,
              private $interval: angular.IIntervalService,
              private $mdToast: angular.material.IToastService,
              private settings: SettingsService,
              private user: UserService) {

    this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    ardorPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = $interval(this.timerHandler.bind(this), 30000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      ardorPendingTransactions.removeListener(listener)
      $interval.cancel(promise)
    })

    this.sockets = [
      {
        name: 'HEAT_Ardr_node',
        socketUrl: 'https://bitnode.heatwallet.com:27876/'
      },
      {
        name: 'Localhost',
        socketUrl: 'http://localhost:27876/'
      }
    ]

    this.$scope['vm'].selectSocketEndPoint = this.sockets.find(w => this.ardorBlockExplorerService.getSocketUrl() == w.socketUrl).name
  }

  changeSocketAddress() {
    let ret = this.sockets.find(w => this.$scope['vm'].selectSocketEndPoint == w.name)
    this.ardorBlockExplorerService.setUrl(ret.socketUrl)
  }

  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.prevIndex += 1
      if (this.prevIndex >= this.pendingTransactions.length) {
        this.prevIndex = 0
      }
      let pendingTxn = this.pendingTransactions[this.prevIndex]
      this.ardorBlockExplorerService.getTransactionStatus(pendingTxn.fullHash).then(
        data => {
          if (data.confirmations) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with id ${pendingTxn.txId} found`).hideDelay(2000));
            this.ardorPendingTransactions.remove(pendingTxn.address, pendingTxn.txId, pendingTxn.time, pendingTxn.fullHash)
          }
        },
        err => {
          console.log('Transaction not found', err)
        }
      )
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.account
      let txns = this.ardorPendingTransactions.pending[addr]
      if (txns) {
        var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        txns.forEach(tx => {
          this.pendingTransactions.push({
            date: dateFormat(new Date(tx.time), format),
            time: tx.time,
            txId: tx.txId,
            address: addr,
            fullHash: tx.fullHash
          })
        })
        this.pendingTransactions.sort((a, b) => b.time - a.time)
      }
    })
  }

  refresh() {
    this.busy = true;
    this.balanceUnconfirmed = "";
    this.ardorBlockExplorerService.getBalance(this.account).then(info => {
      this.$scope.$evalAsync(() => {
        this.balanceUnconfirmed = new Big(utils.convertToQNTf(info)).toFixed(8);
        this.busy = false;
      })
    })
  }
}
