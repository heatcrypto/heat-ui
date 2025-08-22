///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatBtcTransactions',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">
        Latest Transactions
        <span ng-if="vm.cachedItems" style="opacity: 0.8; color: darkorange">&nbsp;&nbsp; (cached)</span>
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>
          <!-- TX ID  -->
          <div class="truncate-col tx-col left">Transaction ID</div>
          <!-- INOUT -->
          <div class="truncate-col inoutgoing-col left">In/Out</div>
          <!-- FROM -->
          <div class="truncate-col message-col left">FROM</div>
          <!-- TO -->
          <div class="truncate-col message-col left">TO</div>
          <!-- AMOUNT -->
          <div class="truncate-col amount-col right">Amount</div>
          <!-- MEMO -->
          <div class="truncate-col message-col left">Memo</div>
          <!-- JSON -->
          <div class="truncate-col json-col"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">
            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>
            <!-- TX ID -->
            <div class="truncate-col tx-col left" >
              <span ng-if="item.blockheight == -1">[unconfirmed]</span>
              <span>
                <a target="_blank" rel="noopener noreferrer" href="https://live.blockcypher.com/btc/tx/{{item.txid}}">{{item.txid}}</a>
              </span>
            </div>
            <!-- INOUT -->
            <div class="truncate-col inoutgoing-col left">
              <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: item.outgoing==false}">
                {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
              </md-icon>
            </div>
            <!-- FROM -->
            <div class="truncate-col message-col left">
             <span>{{item.from}}</span>
            </div>
            <!-- TO -->
            <div class="truncate-col message-col left">
              <span>{{item.to}}</span>
            </div>
            <!-- AMOUNT -->
            <div class="truncate-col amount-col right">
              <span>{{item.amount}}</span>
            </div>
            <!-- MEMO -->
            <div ng-if="item.message" class="truncate-col message-col left" flex>
                <span style="opacity: 0.5">[{{item.message.method == 0 ? "local" : "HEAT"}}]</span> 
                {{item.message.text}}
                <md-tooltip md-delay="800">{{item.message.text}}</md-tooltip>
            </div>
            <span ng-if="!item.message" class="truncate-col message-col left">
              <a href="javascript:void(0);" ng-click="vm.paymentMemoDialog($event, item)">create</a>
            </span>
            
            <!-- JSON -->
            <div class="truncate-col json-col">
              <a ng-click="vm.jsonDetails($event, item.json, item)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope', '$q', 'btcTransactionsProviderFactory', 'settings', 'bitcoinPendingTransactions', 'user', 'storage')
class VirtualRepeatBtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private btcTransactionsProviderFactory: BtcTransactionsProviderFactory,
              private settings: SettingsService,
              private bitcoinPendingTransactions: BitcoinPendingTransactionsService,
              private user: UserService,
              private storage: StorageService) {

    super($scope, $q);
    let store = storage.namespace('currency-cache-btc', this.$scope, true)
    this.cache = {
      get: key => store.get(this.user.currency.address + "-" + key),
      put: (key, value) => store.put(this.user.currency.address + "-" + key, value),
    }
  }

  $onInit() {
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    this.initializeVirtualRepeat(
      this.btcTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any) => {
        transaction.amount = transaction.vout[0].value;
        transaction.dateTime = dateFormat(new Date(transaction.time * 1000), format);
        transaction.from = transaction.vin[0].addr;
        transaction['outgoing'] = this.user.currency.address.toUpperCase() == transaction.from.toUpperCase();
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

        // if BTC were transferred from the unlocked account address then show it as "-Amount"
        if (inputs.includes(this.account)) {
          let totalOut = 0
          for (let i = 0; i < transaction.vout.length; i++) {
            let addresses = transaction.vout[i].scriptPubKey.addresses
            if (addresses && addresses[0] !== this.account) {
              totalOut = totalOut + parseFloat(transaction.vout[i].value)
            }
          }
          transaction.amount = `-${totalOut}`
        } else {
          // if input does not include the current unlocked account address then output will always have it
          for (let i = 0; i < transaction.vout.length; i++) {
            if (transaction.vout[i].scriptPubKey.addresses && transaction.vout[i].scriptPubKey.addresses[0] === this.account) {
              transaction.to = this.account
              transaction.amount = transaction.vout[i].value
              break
            }
          }
        }
        // if change address was different then show hardcoded output
        if (!outputs.includes(this.account) && transaction.vout.length > 1) {
          transaction.to = 'Multiple Outputs'
        }

        //processed item has message value or null so undefined only should be processed
        if (transaction.message === undefined) {
            let p = <Promise<{ method: number; text: string; }>>wlt.loadPaymentMessage(transaction.txid)
            p.then(v => transaction.message = v)
                .catch(reason => console.warn("payment message is not loaded: " + JSON.stringify(reason)))
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
          message: transaction.message || ''
        }
      }
    ).catch(reason =>
        console.warn("initialization btc list component error " + (reason ? JSON.stringify(reason) : "")))

    let refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false)
    let timeout = setTimeout(refresh, 10 * 1000)
    let interval = setInterval(refresh, 60 * 1000)

    let listener = this.determineLength.bind(this)
    this.PAGE_SIZE = 10;
    this.bitcoinPendingTransactions.addListener(listener)

    this.$scope.$on('$destroy', () => {
      this.bitcoinPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
      clearInterval(interval)
    })
  }

    jsonDetails($event, jsonObject, detailedObject?) {
        let fields = [["txid", "id"], ["dateTime", "time"], ["blockheight", "block height"], ["from"], ["to"], ["amount"]]
        dialogs.jsonDetails($event, jsonObject, 'Transaction: ' + jsonObject.txid, fields, detailedObject, true);
    }

    paymentMemoDialog($event, item) {
        let heatService = <HeatService>heat.$inject.get('heat')
        wlt.getHeatUnavailableReason(heatService, this.user.account)
            .then(heatUnavailableReason => wlt.paymentMemoDialog(item.txid, heatUnavailableReason))
            .then(paymentMessage => {
                if (paymentMessage) {
                    item.message = paymentMessage // to display message
                }
                return paymentMessage
            })
            .catch(reason => {
                if (reason) console.error(reason)
            })
    }

    onSelect(selectedTransaction) {
    }

}
