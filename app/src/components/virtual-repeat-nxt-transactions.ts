///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatNextTransactions',
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

            <!-- MESSAGE -->
            <div class="truncate-col message-col left">
              <span>{{item.message}}</span>
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

@Inject('$scope', '$q', 'nextTransactionsProviderFactory', 'settings', 'nextPendingTransactions', 'user', 'nextBlockExplorerService')
class VirtualRepeatNxtTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private nextTransactionsProviderFactory: NextTransactionsProviderFactory,
              private settings: SettingsService,
              private nextPendingTransactions: NextPendingTransactionsService,
              private user: UserService,
              private nextBlockExplorerService: NextBlockExplorerService) {

    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    let secretPhrase = this.user.secretPhrase;
    this.initializeVirtualRepeat(
      this.nextTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any) => {
        transaction.amount = transaction.amountNQT/100000000;
        let date = utils.timestampToDate(transaction.timestamp);
        transaction.dateTime = dateFormat(date, format);
        transaction.from = transaction.senderRS;
        transaction.to = transaction.recipientRS;
        transaction.txid = transaction.transaction;
        transaction.message = ''
        if (transaction.attachment.encryptedMessage) {
          if(transaction.senderPublicKey !== this.user.publicKey)
            transaction.message = heat.crypto.decryptMessage(transaction.attachment.encryptedMessage.data, transaction.attachment.encryptedMessage.nonce, transaction.senderPublicKey, secretPhrase)
          else {
            try {
              let recipientPublicKey;
              this.nextBlockExplorerService.getPublicKeyFromAddress(transaction.recipientRS).then(_publicKey => {
                recipientPublicKey = _publicKey
                transaction.message = heat.crypto.decryptMessage(transaction.attachment.encryptedMessage.data, transaction.attachment.encryptedMessage.nonce, recipientPublicKey, secretPhrase)
                transaction.json.message = transaction.message
              })
            } catch(e) {
              transaction.message = ''
            }
          }
        }
        transaction.json = {
          txid: transaction.transaction,
          time: transaction.dateTime,
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
          block: transaction.height,
          confirmations: transaction.confirmations,
          fee: transaction.feeNQT/100000000
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10 * 1000)

    let listener = this.determineLength.bind(this)
    this.PAGE_SIZE = 10;
    nextPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      nextPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }


  onSelect(selectedTransaction) { }
}