///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatBtcTransactions',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- TX ID  -->
          <div class="he truncate-col info-col left">Transaction ID</div>

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
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>

            <!-- TX ID -->
            <div class="he truncate-col info-col left" >
              <span>
                <a target="_blank" href="https://blockexplorer.com/tx/{{item.txid}}">{{item.txid}}</a>
              </span>
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
              <a ng-click="vm.jsonDetails($event, item)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>

          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope','$q','btcTransactionsProviderFactory','settings', 'bitcoinPendingTransactions')
class VirtualRepeatBtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private btcTransactionsProviderFactory: BtcTransactionsProviderFactory,
              private settings: SettingsService,
              private bitcoinPendingTransactions: BitcoinPendingTransactionsService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.btcTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any|IBTCTransaction) => {
        transaction.amount = transaction.vout[0].value;
        transaction.dateTime = dateFormat(new Date(transaction.time * 1000), format);
        transaction.from = transaction.vin[0].addr;
        transaction.to = transaction.vout[0].scriptPubKey.addresses[0]
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10*1000)

    let listener = this.determineLength.bind(this)
    this.PAGE_SIZE = 10;
    bitcoinPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      bitcoinPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: '+item.txid);
  }


  onSelect(selectedTransaction) {}
}

interface IBTCTransaction {

}