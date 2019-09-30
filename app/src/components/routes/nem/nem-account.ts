@RouteConfig('/nem-account/:account')
@Component({
  selector: 'nemAccount',
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
              <a href="#/nem-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} XEM
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
        <virtual-repeat-nem-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-nem-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'nemBlockExplorerService', 'nemPendingTransactions', '$interval', '$mdToast', 'settings', 'user')
class NemAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;
  pendingTransactions: Array<{ date: string, txId: string, time: number, address: string }> = []
  prevIndex = 0
  busy = true

  constructor(private $scope: angular.IScope,
              private nemBlockExplorerService: NemBlockExplorerService,
              private nemPendingTransactions: NemPendingTransactionsService,
              private $interval: angular.IIntervalService,
              private $mdToast: angular.material.IToastService,
              private settings: SettingsService,
              private user: UserService) {

    this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    nemPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = $interval(this.timerHandler.bind(this), 10000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      nemPendingTransactions.removeListener(listener)
      $interval.cancel(promise)
    })
  }


  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.prevIndex += 1
      if (this.prevIndex >= this.pendingTransactions.length) {
        this.prevIndex = 0
      }
      let pendingTxn = this.pendingTransactions[this.prevIndex]
      this.nemBlockExplorerService.getUnconfirmedTransactions(this.account).then(
        ret => {
          if(ret.length == 0) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with id ${pendingTxn.txId} found`).hideDelay(2000));
              this.nemPendingTransactions.remove(pendingTxn.address, pendingTxn.txId, pendingTxn.time)
          }
        },
        err => {
          console.log('Error getting unconfirmed transactions of account', err)
        }
      )
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.account
      let txns = this.nemPendingTransactions.pending[addr]
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
    this.nemBlockExplorerService.getAccount(this.account).then(info => {
      this.$scope.$evalAsync(() => {
        this.balanceUnconfirmed = new Big(utils.convertToQNTf(info.account.balance.toString(), 6)).toFixed(6);
        this.busy = false;
      })
    })
  }
}
