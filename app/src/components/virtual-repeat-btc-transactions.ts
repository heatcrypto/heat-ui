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
            <div class="truncate-col tx-col left" >
              <span>
                <a target="_blank" href="https://live.blockcypher.com/btc/tx/{{item.txid}}">{{item.txid}}</a>
              </span>
            </div>

            <!-- FROM -->
            <div class="truncate-col info-col left">
              <span ng-show = "item.to !== 'Multiple Inputs'">{{item.from}}</span>
              <a ng-show = "item.to === 'Multiple Inputs'" ng-click="vm.jsonDetails($event, item.json)">{{item.from}}</a>
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

@Inject('$scope', '$q', 'btcTransactionsProviderFactory', 'settings', 'bitcoinPendingTransactions', 'user', 'bitcoinMessagesService')
class VirtualRepeatBtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  btcMessages: Array<{ txId: string, message: string }> = []
  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private btcTransactionsProviderFactory: BtcTransactionsProviderFactory,
    private settings: SettingsService,
    private bitcoinPendingTransactions: BitcoinPendingTransactionsService,
    private user: UserService,
    private bitcoinMessagesService: BitcoinMessagesService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    let privateKey = this.user.secretPhrase;
    let publicKey = this.user.publicKey;
    this.getBitcoinMessages(privateKey, publicKey)
    this.initializeVirtualRepeat(
      this.btcTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any | IBTCTransaction) => {
        this.btcMessages.forEach(message => {
          if (message.txId == transaction.txid) {
            transaction.displayMessage = message.message;
            if (transaction.displayMessage.length > 13) {
              transaction.displayMessage = transaction.displayMessage.substr(0, 10).concat('...')
            }
            transaction.message = message.message
          }
        })
        transaction.dateTime = dateFormat(new Date(transaction.time * 1000), format);
        if (transaction.vin.length > 1) {
          transaction.from = "Multiple Inputs";
        } else {
          transaction.from = transaction.vin[0].addr;
        }
        if (transaction.vout.length > 2) {
          transaction.to = 'Multiple Outputs'
        } else {
          let isSameChangeAddress = false;
          let to;
          let value;
          transaction.vout.forEach(entry => {
            if (entry.scriptPubKey && entry.scriptPubKey.addresses && transaction.from != 'Multiple Inputs' && entry.scriptPubKey.addresses.includes(transaction.from))
              isSameChangeAddress = true;
            else {
              to = entry.scriptPubKey.addresses[0]
              value = entry.value
            }
          });
          if (!isSameChangeAddress){
            transaction.to = 'Multiple Outputs'
            transaction.amount = ''
          }
          else {
            transaction.to = to
            transaction.amount = value
          }
        }
        if(transaction.from == this.account)
          transaction.amount = `-${transaction.amount}`;
        var inputs = '', outputs = ''
        transaction.vin.forEach(entry => inputs = inputs.concat(`${entry.addr} (${entry.value}) \n`));
        transaction.vout.forEach(entry => outputs = outputs.concat(`${entry.scriptPubKey.addresses[0]} (${entry.value}) \n`));

        transaction.json = {
          txid: transaction.txid,
          time: transaction.dateTime,
          block: transaction.blockheight,
          totalInputs: transaction.valueIn,
          totalOutputs: transaction.valueOut,
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
    bitcoinPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      bitcoinPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }


  onSelect(selectedTransaction) { }

  getBitcoinMessages = (privateKey: string, publicKey: string) => {
    this.btcMessages = []
    let addr = this.user.account
    let messages = this.bitcoinMessagesService.messages[addr]
    if (messages) {
      messages.forEach(entry => {
        let parts = entry.message.split(':'), data = parts[0], nonce = parts[1]
        let message = heat.crypto.decryptMessage(data, nonce, publicKey, privateKey)
        this.btcMessages.push({
          txId: entry.txId,
          message: message
        })
      })
    }
  }
}

interface IBTCTransaction {

}