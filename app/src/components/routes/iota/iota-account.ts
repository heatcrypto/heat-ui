@RouteConfig('/iota-account/:account')
@Component({
  selector: 'iotaAccount',
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
              <a href="#/iota-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} IOTA
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
        <virtual-repeat-iota-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-iota-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'iotaBlockExplorerService', 'iotaPendingTransactions', '$interval', '$mdToast', 'settings', 'user')
class IotaAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;
  pendingTransactions: Array<{ date: string, txId: string, time: number, address: string }> = []
  prevIndex = 0
  busy = true

  constructor(private $scope: angular.IScope,
    private iotaBlockExplorerService: IotaBlockExplorerService,
    private iotaPendingTransactions: IotaPendingTransactionsService,
    private $interval: angular.IIntervalService,
    private $mdToast: angular.material.IToastService,
    private settings: SettingsService,
    private user: UserService) {

    this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    iotaPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = $interval(this.timerHandler.bind(this), 30000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      iotaPendingTransactions.removeListener(listener)
      $interval.cancel(promise)
    })

  }

  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.iotaBlockExplorerService.getAccountInfo(this.user.currency.secretPhrase).then(recentTransactions => {
        for(let i = 0; i < this.pendingTransactions.length; i++) {
          let isPending = true;
          for(let j = 0; j < recentTransactions.transfers.length; j++) {
            if(recentTransactions.transfers[j][0].hash == this.pendingTransactions[i].txId) {
              isPending = false;
              break;
            }
          }
          if(!isPending) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with id ${this.pendingTransactions[i].txId} found`).hideDelay(2000));
            this.iotaPendingTransactions.remove(this.pendingTransactions[i].address, this.pendingTransactions[i].txId, this.pendingTransactions[i].time)
          }
        }
      }, err => {
        console.log('Error in getting recent IOTA Transactions '+ err)
      })
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.currency.address
      let txns = this.iotaPendingTransactions.pending[addr]
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
    this.iotaBlockExplorerService.getAccountInfo(this.user.currency.secretPhrase).then(info => {
      this.$scope.$evalAsync(() => {
        this.balanceUnconfirmed = info ? info.balance : 0;
        this.busy = false;
      })
    })
  }
}
