///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatNemTransactions',
  inputs: ['account'],
  template: `
    <script type="text/ng-template" id="popoverNemtx.html">
      <div class="account-popover">
        <a target="_blank" href="http://chain.nem.ninja/#/transfer/{{item.txid}}">{{item.txid}}</a>
      </div>
    </script>
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
            <div class="truncate-col tx-col left" >
              <div
                class="info"
                angular-popover
                direction="column"
                template-url="popoverNemtx.html"
                mode="mouseover"
                style="position: absolute;"></div>
              <span>{{item.truncatedTxid}}</span>
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

@Inject('$scope', '$q', 'settings', 'nemPendingTransactions', 'nemBlockExplorerService', 'nemCryptoService')
class VirtualRepeatNemTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  transactions: Array<any> = [];
  prefetchedTransactions: Array<any> = [];
  lastHash: string
  moreTransactions: boolean = true;

  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private settings: SettingsService,
    private nemPendingTransactions: NemPendingTransactionsService,
    private nemBlockExplorerService: NemBlockExplorerService,
    private nemCryptoService: NEMCryptoService) {

    super($scope, $q);
    this.fetchTransactions().then(() => {
      this.prefetchNextLot();
    })

    let listener = this.determineLength.bind(this)
    nemPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      nemPendingTransactions.removeListener(listener)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }

  prefetchNextLot = () => {
    this.transactions = angular.copy(this.prefetchedTransactions);
    if (this.prefetchedTransactions.length % 25 == 0) {
      this.fetchTransactions();
    } else {
      this.moreTransactions = false;
    }
  }

  fetchTransactions = () => {
    return new Promise((resolve, reject) => {
      let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
      this.nemBlockExplorerService.getTransactions(this.account, this.lastHash).then(txns => {
        txns.forEach(entry => {
          entry.amount = entry.transaction.amount / 1000000;
          let date = utils.nemTimestampToDate(entry.transaction.timeStamp);
          entry.dateTime = dateFormat(date, format);
          entry.from = this.nemCryptoService.getAddressFromPublicKey(entry.transaction.signer);
          entry.to = entry.transaction.recipient;
          entry.txid = entry.meta.hash.data;
          entry.truncatedTxid = this.truncateTxId(entry.txid)
          this.lastHash = entry.meta.hash.data;
          entry.fee = entry.transaction.fee;
          entry.json = {
            txid: entry.transaction,
            time: entry.dateTime,
            from: entry.from,
            to: entry.to,
            amount: entry.amount,
            block: entry.meta.height,
            fee: entry.fee / 1000000
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