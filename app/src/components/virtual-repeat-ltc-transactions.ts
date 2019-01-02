///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatLtcTransactions',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-button class="md-primary md-raised load-more" ng-click="vm.prefetchNextLot()" ng-show="vm.moreTransactions">
        <label for="walet-input-file">
          Load More
        </label>
      </md-button>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>
          <!-- TX ID  -->
          <div class="truncate-col tx-col left">Transaction ID</div>
          <!-- FROM -->
          <div class="truncate-col info-col left">FROM</div>
          <!-- TO -->
          <div class="truncate-col info-col left">TO</div>
          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>
          <!-- JSON -->
          <div class="truncate-col json-col"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm.transactions" aria-label="Entry" class="row">
            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>
            <!-- TX ID -->
            <div class="truncate-col tx-col left">
              <span>{{item.txid}}</span>
            </div>
            <!-- FROM -->
            <div class="truncate-col info-col left">
             <span>{{item.from}}</span>
            </div>
            <!-- TO -->
            <div class="truncate-col info-col left">
              <span>{{item.to}}</span>
            </div>
            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">
              <span>{{item.amount}}</span>
            </div>
            <!-- JSON -->
            <div class="truncate-col json-col">
              <a ng-click="vm.jsonDetails($event, item.json)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope', '$q', 'settings', 'ltcPendingTransactions', 'ltcBlockExplorerService', 'ltcCryptoService')
class VirtualRepeatLtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  transactions: Array<any> = [];
  prefetchedTransactions: Array<any> = [];
  blockNum: string
  moreTransactions: boolean = true;

  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private settings: SettingsService,
    private ltcPendingTransactions: LtcPendingTransactionsService,
    private ltcBlockExplorerService: LtcBlockExplorerService,
    private ltcCryptoService: LTCCryptoService) {

    super($scope, $q);
    this.fetchTransactions().then(() => {
      this.prefetchNextLot();
    })

    let listener = this.determineLength.bind(this)
    ltcPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      ltcPendingTransactions.removeListener(listener)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }

  prefetchNextLot = () => {
    this.transactions = angular.copy(this.prefetchedTransactions);
    if (this.prefetchedTransactions.length % 10 == 0) {
      this.fetchTransactions();
    } else {
      this.moreTransactions = false;
    }
  }

  fetchTransactions = () => {
    return new Promise((resolve, reject) => {
      let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
      this.ltcBlockExplorerService.getTransactions(this.account, this.blockNum).then(txns => {
        txns.forEach(entry => {
          entry.dateTime = dateFormat(new Date(entry.received), format);
          entry.from = entry.inputs[0].addresses[0]
          entry.to = entry.outputs[0].addresses[0]
          entry.amount = entry.outputs[0].value / 100000000
          entry.txid = entry.hash
          this.blockNum = entry.block_height
          entry.json = {
            from: entry.from,
            to: entry.to,
            time: entry.dateTime,
            amount: entry.amount
          }
          this.prefetchedTransactions.push(entry)
        });
        resolve()
      })
    })
  }

  truncateTxId = (txId) => {
    return txId.substr(0, 50).concat('..')
  }

  onSelect(selectedTransaction) { }
}