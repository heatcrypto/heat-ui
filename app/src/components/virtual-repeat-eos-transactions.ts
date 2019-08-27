///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatEosTransactions',
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
          <div class="truncate-col tx-col left">Transaction ID</div>

          <!-- FROM -->
          <div class="truncate-col info-col left">FROM</div>

          <!-- TO -->
          <div class="truncate-col info-col left">TO</div>

          <!-- AMOUNT -->
          <div class="truncate-col amount-col">Amount</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container  flex layout-fill layout="column" virtual-repeat-flex-helper  class="content">
          <md-list-item md-virtual-repeat="item in vm.transactions">
            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>

            <!-- TX ID -->
            <div class="truncate-col tx-col left" >
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
            <div class="truncate-col amount-col">
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

@Inject('$scope', '$q', 'settings', 'eosPendingTransactions', 'user', 'eosBlockExplorerService')
class VirtualRepeatEosTransactionsComponent {

  account: string; // @input
  transactions: Array<any> = [];

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private settings: SettingsService,
              private eosPendingTransactions: EosPendingTransactionsService,
              private user: UserService,
              private eosBlockExplorerService: EosBlockExplorerService) {

    eosBlockExplorerService.getTransactions(this.account).then(txns => {
      txns.forEach(tx => {
        let transaction = {
          from: tx.lifecycle.execution_trace.action_traces[0].act.data.from,
          to: tx.lifecycle.execution_trace.action_traces[0].act.data.to,
          amount: tx.lifecycle.execution_trace.action_traces[0].act.data.quantity,
          txid: tx.lifecycle.id,
          dateTime: tx.lifecycle.execution_trace.block_time,
          blockNumber: tx.lifecycle.execution_trace.block_num
        }
        this.transactions.push(transaction)
      });
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }


  onSelect(selectedTransaction) { }
}
