@RouteConfig('/fimk-account/:account')
@Component({
  selector: 'fimkAccount',
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
              <a href="#/fimk-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} FIM
            </div>
          </div>
        </div>
        <div layout="column">
          <div class="col-item">
            <div class="title">
              FIMK Server:
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
        <virtual-repeat-fimk-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-fimk-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'mofoSocketService', 'fimkPendingTransactions', '$interval', '$mdToast', 'settings', 'user')
class FimkAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;
  pendingTransactions: Array<{ date: string, txId: string, time: number, address: string }> = []
  prevIndex = 0
  busy = true
  sockets: any;
  selectSocketEndPoint = 'Mofowallet'

  constructor(private $scope: angular.IScope,
    private mofoSocketService: MofoSocketService,
    private fimkPendingTransactions: FimkPendingTransactionsService,
    private $interval: angular.IIntervalService,
    private $mdToast: angular.material.IToastService,
    private settings: SettingsService,
    private user: UserService) {

    this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    fimkPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = $interval(this.timerHandler.bind(this), 30000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      fimkPendingTransactions.removeListener(listener)
      $interval.cancel(promise)
    })

    this.sockets = [
      {
        name: 'Mofowallet',
        socketUrl: 'wss://cloud.mofowallet.org:7986/ws/'
      },
      {
        name: 'Localhost',
        socketUrl: 'ws://localhost:7986/ws/'
      }
    ]
  }

  changeSocketAddress() {
    let ret = this.sockets.find(w => this.$scope['vm'].selectSocketEndPoint == w.name)
    this.mofoSocketService.closeSocket();
    this.mofoSocketService.mofoSocket(ret.socketUrl)
  }

  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.mofoSocketService.getRecentTx(this.user.account).then(recentTransactions => {
        for(let i = 0; i < this.pendingTransactions.length; i++) {
          let isPending = false;
          for(let j = 0; j < recentTransactions.length; j++) {
            if(recentTransactions[j].transaction == this.pendingTransactions[i].txId) {
              isPending = true;
              break;
            }
          }
          if(!isPending) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with id ${this.pendingTransactions[i].txId} found`).hideDelay(2000));
            this.fimkPendingTransactions.remove(this.pendingTransactions[i].address, this.pendingTransactions[i].txId, this.pendingTransactions[i].time)
          }
        }
      }, err => {
        console.log('Error in getting recent FIMK Transactions '+ err)
      })
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.account
      let txns = this.fimkPendingTransactions.pending[addr]
      if (txns) {
        var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        txns.forEach(tx => {
          this.pendingTransactions.push({
            date: dateFormat(new Date(tx.time), format),
            time: tx.time,
            txId: tx.txId,
            address: addr
          })
        })
        this.pendingTransactions.sort((a, b) => b.time - a.time)
      }
    })
  }

  refresh() {
    this.busy = true;
    this.balanceUnconfirmed = "";
    this.mofoSocketService.getAccount(this.account).then(info => {
      this.$scope.$evalAsync(() => {
        let balance = info.unconfirmedBalanceNQT ? parseInt(info.unconfirmedBalanceNQT) / 100000000 : 0;
        let formattedBalance = new Big(balance + "");
        this.balanceUnconfirmed = new Big(formattedBalance).toFixed(8);
        this.busy = false;
      })
    })
  }
}
