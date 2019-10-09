///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatLtcTransactions',
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
          <div class="truncate-col amount-col right">Amount</div>
          <!-- JSON -->
          <div class="truncate-col json-col"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">
            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>
            <!-- TX ID -->
            <div class="truncate-col tx-col left">
              <span>
                <a target="_blank" href="https://ltc1.heatwallet.com/tx/{{item.txid}}">{{item.txid}}</a>
              </span>
            </div>
            <!-- FROM -->
            <div class="truncate-col info-col left">
              <span ng-show = "item.from !== 'Multiple Inputs'">{{item.from}}</span>
              <a ng-show = "item.from === 'Multiple Inputs'" ng-click="vm.jsonDetails($event, item.json)">{{item.from}}</a>
            </div>
            <!-- TO -->
            <div class="truncate-col info-col left">
              <span ng-show = "item.to !== 'Multiple Outputs'">{{item.to}}</span>
              <a ng-show = "item.to === 'Multiple Outputs'" ng-click="vm.jsonDetails($event, item.json)">{{item.to}}</a>
            </div>
            <!-- AMOUNT -->
            <div class="truncate-col amount-col right">
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

@Inject('$scope', '$q', 'ltcTransactionsProviderFactory', 'settings', 'ltcPendingTransactions', 'user')
class VirtualRepeatLtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private ltcTransactionsProviderFactory: LtcTransactionsProviderFactory,
    private settings: SettingsService,
    private ltcPendingTransactions: LtcPendingTransactionsService,
    private user: UserService) {

    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    this.initializeVirtualRepeat(
      this.ltcTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any) => {
        transaction.txid = transaction.txid;
        transaction.dateTime = dateFormat(new Date(transaction.blockTime * 1000), format);
        transaction.from = transaction.vin[0].addresses[0];
        transaction.amount = transaction.vout[0].value / 100000000;

        let totalInputs = 0;
        let inputs = '';
        for (let i = 0; i < transaction.vin.length; i++) {
          totalInputs += parseFloat(transaction.vin[i].value);
          inputs += `
          ${transaction.vin[i].addresses[0]} (${(parseFloat(transaction.vin[i].value) / 100000000).toFixed(8)})`;
        }

        let totalOutputs = 0;
        let outputs = '';
        for (let i = 0; i < transaction.vout.length; i++) {
          totalOutputs += parseFloat(transaction.vout[i].value);
          outputs += `
          ${transaction.vout[i].addresses[0]} (${(parseFloat(transaction.vout[i].value) / 100000000).toFixed(8)})`;
        }

        for (let i = 0; i < transaction.vout.length && transaction.vout[i].addresses; i++) {
          if (transaction.vout[i].addresses) {
            transaction.to = transaction.vout[0].addresses[0];
            break;
          }
        }
        if (transaction.from === transaction.to) {
          for (let i = 1; i < transaction.vout.length && transaction.vout[i].addresses; i++) {
            transaction.to = transaction.vout[i].addresses[0];
            transaction.amount = transaction.vout[i].value / 100000000;
            break;
          }
        }

        if (inputs.includes(this.account)) {
          transaction.amount = `-${transaction.amount}`;
        } else {
          for (let i = 0; i < transaction.vout.length; i++) {
            if (transaction.vout[i].addresses && transaction.vout[i].addresses[0] === this.account) {
              transaction.to = this.account;
              transaction.amount = transaction.vout[i].value / 100000000;
            }
          }
        }
        if (!outputs.includes(this.account) && transaction.vout.length > 1) {
          transaction.to = 'Multiple Outputs';
        }

        transaction.json = {
          txid: transaction.txid,
          time: transaction.dateTime,
          block: transaction.blockHeight,
          totalInputs,
          totalOutputs,
          confirmations: transaction.confirmations,
          fees: transaction.fees / 100000000,
          inputs: inputs.trim(),
          outputs: outputs.trim()
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10 * 1000)

    let listener = this.determineLength.bind(this)
    this.PAGE_SIZE = 10;
    ltcPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      ltcPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }

  onSelect(selectedTransaction) { }
}