///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatBchTransactions',
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
          <div class="truncate-col amount-col left">Amount</div>

          <!-- MESSAGE -->
          <div class="truncate-col message-col left">Message</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>

            <!-- TX ID -->
            <div class="truncate-col tx-col left" >{{item.txid}}</div>

            <!-- FROM -->
            <div class="truncate-col info-col left">
             <span>{{item.from}}</span>
            </div>

            <!-- TO -->
            <div class="truncate-col info-col left">
              <span ng-show = "item.to !== 'Multiple Outputs'">{{item.to}}</span>
              <a ng-show = "item.to === 'Multiple Outputs'" ng-click="vm.jsonDetails($event, item.json)">{{item.to}}</a>
            </div>

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">
              <span>{{item.amount}}</span>
            </div>

            <!-- MESSAGE -->
            <div class="truncate-col message-col left">
              <span>{{item.displayMessage}}</span>
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

@Inject('$scope', '$q', 'bchTransactionsProviderFactory', 'settings', 'bchPendingTransactions', 'user', 'bitcoinMessagesService')
class VirtualRepeatBchTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private bchTransactionsProviderFactory: BchTransactionsProviderFactory,
    private settings: SettingsService,
    private bchPendingTransactions: BchPendingTransactionsService,
    private user: UserService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    this.initializeVirtualRepeat(
      this.bchTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any) => {
        transaction.amount = transaction.vout[0].value;
        transaction.dateTime = dateFormat(new Date(transaction.time * 1000), format);
        transaction.from = transaction.vin[0].addr;
        let totalInputs = 0;
        let inputs = '';
        for (let i = 0; i < transaction.vin.length; i++) {
          totalInputs += parseFloat(transaction.vin[i].value);
          inputs += `
          ${transaction.vin[i].addr} (${transaction.vin[i].value})`;
          if (transaction.vin[i].addr === this.account) {
            transaction.from = transaction.vin[i].addr;
          }
        }

        let totalOutputs = 0;
        let outputs = '';
        for (let i = 0; i < transaction.vout.length; i++) {
          totalOutputs += parseFloat(transaction.vout[i].value);
          if (transaction.vout[i].scriptPubKey.addresses) {
            outputs += `
            ${transaction.vout[i].scriptPubKey.addresses[0]} (${transaction.vout[i].value})`;
          }
        }
        // by default assign To field to zeroth address
        for (let i = 0; i < transaction.vout.length && transaction.vout[i].scriptPubKey.addresses; i++) {
          if (transaction.vout[i].scriptPubKey.addresses) {
            transaction.to = transaction.vout[0].scriptPubKey.addresses[0];
            break;
          }
        }
        // if change address is same and API returns change address as zeroth address then point To field and volume to some other address
        if (transaction.from === transaction.to) {
          for (let i = 1; i < transaction.vout.length && transaction.vout[i].scriptPubKey.addresses; i++) {
            transaction.to = transaction.vout[i].scriptPubKey.addresses[0];
            transaction.amount = transaction.vout[i].value;
            break;
          }
        }

        // if BCH were transferred from the unlocked account address then show it as "-Amount"
        if (inputs.includes(this.account)) {
          transaction.amount = `-${transaction.amount}`;
        } else {
          // if input does not include the current unlocked account address then output will always have it
          for (let i = 0; i < transaction.vout.length; i++) {
            if (transaction.vout[i].scriptPubKey.addresses && transaction.vout[i].scriptPubKey.addresses[0] === this.account) {
              transaction.to = this.account;
              transaction.amount = transaction.vout[i].value;
            }
          }
        }
        // if change address was different then show hardcoded output
        if (!outputs.includes(this.account)) {
          transaction.to = 'Multiple Outputs';
        }

        transaction.json = {
          txid: transaction.txid,
          time: transaction.dateTime,
          block: transaction.blockheight,
          totalInputs,
          totalOutputs,
          confirmations: transaction.confirmations,
          fees: transaction.fees,
          inputs: inputs.trim(),
          outputs: outputs.trim(),
          size: transaction.size,
          message: transaction.message ? transaction.message : ''
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10 * 1000)

    let listener = this.determineLength.bind(this)
    this.PAGE_SIZE = 10;
    bchPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      bchPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }


  onSelect(selectedTransaction) { }
}