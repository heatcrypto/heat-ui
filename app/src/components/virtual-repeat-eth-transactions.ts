///<reference path='VirtualRepeatComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2021 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
@Component({
  selector: 'virtualRepeatEthTransactions',
  inputs: ['account','personalize'],
  styles: [`
    .failed {
      color: red;
    }
    .pending {
      color: coral;
    }
    .pointer {
      cursor: pointer;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">
        Latest Transactions <span ng-if="vm.cachedItems" style="opacity: 0.8; color: darkorange">&nbsp;&nbsp; (cached)</span>
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- HEIGHT
          <div class="he truncate-col height-col left" ng-if="!vm.personalize">Height</div>
          -->

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- ID -->
          <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">Id</div>

          <!-- INOUT -->
          <div class="truncate-col inoutgoing-col left" ng-if="vm.personalize">In/Out</div>

          <!-- TRANSACTION -->
          <!-- <div class="truncate-col transaction-col left" ng-if="vm.personalize">Transaction</div> -->

          <!-- AMOUNT -->
          <div class="truncate-col amount-col" ng-if="vm.personalize">Amount</div>

          <!-- TOFROM -->
          <div class="truncate-col tofrom-col left" ng-if="vm.personalize">To/From</div>

          <!-- INFO -->
          <div class="truncate-col info-col left" flex>Info</div>

          <!-- Memo -->
          <div class="truncate-col left" flex>Memo</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- HEIGHT
            <div class="he truncate-col height-col left" ng-if="!vm.personalize">
              <span ng-show="item.height!=2147483647">{{item.heightDisplay}}</span>
              <span>
                <a target="_blank" rel="noopener noreferrer" href="https://etherscan.io/block/{{item.heightDisplay}}">{{item.heightDisplay}}</a>
              </span>
            </div>
            -->

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- ID -->
            <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">
              <a class="pointer" ng-click="vm.txnDetails($event, item)">{{item.hash}}</a>
            </div>

            <!-- INOUT -->
            <div class="truncate-col inoutgoing-col left" ng-if="vm.personalize">
              <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: item.outgoing==false}">
                {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
              </md-icon>
            </div>

            <!-- TRANSACTION -->
            <!-- <div class="truncate-col transaction-col left" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedTransactionType"></span>
            </div> -->

            <!-- AMOUNT -->
            <div class="truncate-col amount-col" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedAmount"></span>
            </div>

            <!-- TOFROM -->
            <div class="truncate-col tofrom-col left" ng-if="vm.personalize">
              <a class="pointer" ng-click="vm.addressDetails($event, item.renderedToFrom)">{{item.renderedToFrom}}</a>
<!--              <span ng-bind-html="item.renderedToFrom"></span>-->
            </div>

            <!-- INFO -->
            <div class="truncate-col info-col left" flex>
              <span ng-bind-html="item.renderedInfo"></span>
            </div>

            <!-- MEMO -->
            <div ng-if="item.message" class="truncate-col left" flex>
                <span style="opacity: 0.5">[{{item.message.method == 0 ? "local" : "HEAT"}}]</span> 
                {{item.message.text}}
                <md-tooltip md-delay="800">{{item.message.text}}</md-tooltip>
            </div>
            <span ng-if="!item.message" class="truncate-col left">
              <a class="pointer" ng-click="vm.paymentMemoDialog($event, item)">create</a>
            </span>

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

@Inject('$scope','$q','ethTransactionsProviderFactory','settings','user','render',
  '$mdPanel','controlCharRender','web3','ethereumPendingTransactions', 'storage', 'http')
class VirtualRepeatEthTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  personalize: boolean; // @input

  renderer: EthTransactionRenderer = new EthTransactionRenderer(this);
  private ethBlockExplorerService: EthBlockExplorerService;

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private ethTransactionsProviderFactory: EthTransactionsProviderFactory,
              private settings: SettingsService,
              private user: UserService,
              private render: RenderService,
              private $mdPanel: angular.material.IPanelService,
              private controlCharRender: ControlCharRenderService,
              private web3: Web3Service,
              private ethereumPendingTransactions: EthereumPendingTransactionsService,
              private storage: StorageService,
              private http: HttpService) {
    super($scope, $q)
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
    this.cache = {
      get: key => db.getValue(wlt.CACHE_KEY.addressInfo('ETH', this.account) + '-' + key).then(r => r?.value),
      put: (key, value) => db.putValue(wlt.CACHE_KEY.addressInfo('ETH', this.account) + '-' + key, value),
    }
  }

  $onInit() {
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.ethTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: EthplorerAddressTransactionExtended) => {
        var date = new Date(0); // 0 sets date to epoch time
        date.setUTCSeconds(<any>transaction.timestamp);
        transaction['time'] = dateFormat(date, format);
        transaction['heightDisplay'] = 'no height'
        if (this.personalize) {
          transaction['outgoing'] = this.user.currency.address.toUpperCase() == transaction.from.toUpperCase();

          //transaction['renderedTransactionType'] = this.renderer.renderTransactionType(transaction);
          let amountVal = this.renderer.renderAmount(transaction);
          transaction['renderedAmount'] = amountVal;
          transaction['renderedToFrom'] = this.renderer.renderedToFrom(transaction);
        }

        let renderedInfo = this.renderer.renderInfo(transaction);
        if (angular.isString(renderedInfo)) {
          transaction['renderedInfo'] = renderedInfo;
        } else if (angular.isObject(renderedInfo)) {
          renderedInfo.then((text) => {
            transaction['renderedInfo'] = text;
          })
        }

        //processed item has message value or null so undefined only should be processed
        if (transaction['message'] === undefined) {
          let p = <Promise<{ method: number; text: string; }>>wlt.loadPaymentMessage(transaction.hash)
          p.then(v => transaction['message'] = v)
              .catch(reason => console.warn("payment message is not loaded: " + JSON.stringify(reason)))
        }

      }
    ).catch(reason => console.warn("initialization eth list component error " + (reason ? JSON.stringify(reason) : "")))

    let refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false)
    let interval = setInterval(refresh, 60 * 1000)

    let listener = this.updateOnNewTransaction.bind(this)
    this.ethereumPendingTransactions.addListener(listener)

    this.$scope.$on('$destroy', () => {
      this.ethereumPendingTransactions.removeListener(listener)
      clearInterval(interval)
    })
  }

  updateOnNewTransaction(pendingTxRemoved) {
    if (!pendingTxRemoved) {
      let interval = setInterval(this.determineLength.bind(this), 7 * 1000)
      setTimeout(() => clearInterval(interval), 50 * 1000)
    }
  }

  jsonDetails($event, item) {
    let fields = [["hash", "id"], ["time"], ["from"], ["to"], ["renderedAmount", "amount"]]
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.hash, fields)
  }

  txnDetails($event, item) {
    this.ethBlockExplorerService.getTxInfo(item.hash).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response
      if (parsed) {
        let fields = [["hash", "id"], ["time"], ["from"], ["to"], ["renderedAmount", "amount"]]
        dialogs.jsonDetails($event, parsed, 'Transaction: ' + (parsed.txid || parsed.hash), fields, item, true)
      }
    },
    reason => {
      if (reason) console.error(reason)
    })
  }

  addressDetails($event, address) {
    this.ethBlockExplorerService.getAddressInfo(address, true).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response
      if (parsed) {
        parsed.renderedAmount = (parsed.ETH?.balance || ((parsed.balance || 0) / 1000000000000000000)) + " ETH"
        parsed.countTxs = parsed.countTxs || parsed.txs
        let fields = [["address"], ["renderedAmount", "balance"], ["countTxs", "number of transactions"]]
        if (parsed.nonce) fields.push(["nonce"])
        dialogs.jsonDetails(null, parsed, 'Address: ' + parsed.address, fields, null, true)
      }
    },reason => {
      if (reason) console.error(reason)
    })
  }

  paymentMemoDialog($event, item) {
    let heatService = <HeatService>heat.$inject.get('heat')
    return wlt.getHeatUnavailableReason(heatService, this.user.account)
        .then(heatUnavailableReason => wlt.paymentMemoDialog(item.hash, heatUnavailableReason))
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

  imageUrl(contractAddress: string) {
    return `https://raw.githubusercontent.com/dmdeklerk/tokens/master/images/${contractAddress}.png`
  }

  renderSync(transaction: EthplorerAddressTransactionExtended) {
    try {
      if (transaction['erc20']) {
        //console.log(transaction['erc20'])
        return JSON.stringify(transaction['erc20'])
      }
      return this.web3.parseInput(transaction.input)
    } catch (e) {
      console.log(e)
    }
  }

  onSelect(selectedTransaction) {}
}

interface EthTemplateFunction {
  (transaction: EthplorerAddressTransactionExtended):string;
}

class EthTransactionRenderHelper {
  private $q: angular.IQService;
  constructor(private template: string|EthTemplateFunction,
              private extractor: (transaction: EthplorerAddressTransactionExtended)=>Object) {
    this.$q = <angular.IQService> heat.$inject.get('$q');
  }

  private isPromise(val) {
    return angular.isObject(val) && angular.isFunction(val['then']);
  }

  public render(transaction: EthplorerAddressTransactionExtended): angular.IPromise<string>|string {
    var parts = this.extractor(transaction);
    var args: IStringHashMap<string> = {};
    var promises = [];
    angular.forEach(parts, (val,key) => {
      if (this.isPromise(val)) {
        promises.push(val);
        val.then((promiseVal)=>{
          args[key]=promiseVal;
        });
      }
      else {
        args[key]=val;
      }
    });
    let template = angular.isFunction(this.template) ? (<(x)=>string>this.template).call(null, transaction) : this.template;
    let text = (' ' + template).slice(1);
    if (promises.length>0) {
      var deferred = this.$q.defer<string>();
      this.$q.all(promises).then(()=>{
        angular.forEach(args, (val,key) => {
          text = text.replace(new RegExp("\\$"+key, 'g'), val);
        });
        deferred.resolve(text);
      });
      return deferred.promise;
    }
    angular.forEach(args, (val,key) => {
      text = text.replace(new RegExp("\\$"+key, 'g'), val);
    })
    return text;
  }
}

class EthTransactionRenderer {

  // ether transfer
  private TYPE_ETHEREUM_TRANSFER = 'eth:transfer'

  // erc20
  private TYPE_ERC20_APPROVE = 'approve'
  private TYPE_ERC20_ALLOWANCE = 'allowance'
  private TYPE_ERC20_TRANSFER = 'transfer'
  private TYPE_ERC20_TRANSFER_FROM = 'transferFrom'

  // etherdelta_2 | https://etherscan.io/address/0x8d12a197cb00d4747a1fe03395095ce2a5cc6819#code
  private TYPE_ETHERDELTA_DEPOSIT_TOKEN = 'depositToken'
  private TYPE_ETHERDELTA_WITHDRAWAL = 'withdraw'
  private TYPE_ETHERDELTA_WITHDRAWAL_TOKEN = 'withdrawToken'
  private TYPE_ETHERDELTA_ORDER = 'order'
  private TYPE_ETHERDELTA_TRADE = 'trade'
  private TYPE_ETHERDELTA_TRADE_BALANCES = 'tradeBalances'
  private TYPE_ETHERDELTA_CANCEL_ORDER = 'cancelOrder'

  private $q: angular.IQService;
  private renderers: IStringHashMap<EthTransactionRenderHelper> = {};
  private transactionTypes: IStringHashMap<string> = {};
  private ethTransactionParser: EthTransactionParserService
  private ethBlockExplorerService: EthBlockExplorerService

  constructor(private provider?: {account?: string, personalize: boolean}) {
    let key;
    this.$q = <angular.IQService> heat.$inject.get('$q');
    this.ethTransactionParser = <EthTransactionParserService> heat.$inject.get('ethTransactionParser');
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
    key = this.TYPE_ETHEREUM_TRANSFER;
    this.transactionTypes[key] = 'TRANSFER';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>TRANSFER</b> $amount from $from to $to",
      (t) => {
        return {
          status: this.status(t),
          from: this.account(t.from),
          to: this.account(t.to),
          amount: this.amount(t.value)
        }
      }
    );
    key = this.TYPE_ERC20_APPROVE;
    this.transactionTypes[key] = 'ERC20 APPROVE';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>ERC20 APPROVE</b> $from $to $spender $value",
      (t) => {
        return {
          status: this.status(t),
          from: this.account(t.from),
          to: this.account(t.to),
          spender: this.account(t.abi.decodedData.params[0].value),
          value: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ERC20_ALLOWANCE;
    this.transactionTypes[key] = 'ERC20 ALLOWANCE';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return '<b>ERC20 ALLOWANCE</b> '
      },
      (t) => {
        return {
        }
      }
    );
    key = this.TYPE_ERC20_TRANSFER
    this.transactionTypes[key] = 'ERC20 TRANSFER';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>ERC20 TRANSFER</b> Send $value $token from $from to $to",
      (t) => {
        return {
          status: this.status(t),
          token: this.token(t.to),
          from: this.account(t.from),
          to: this.account(t.abi.decodedData.params[0].value),
          value: this.amount(t.abi.decodedData.params[1].value, this.ethBlockExplorerService.tokenInfoCache[t.to])
        }
      }
    );
    key = this.TYPE_ERC20_TRANSFER_FROM
    this.transactionTypes[key] = 'ERC20 TRANSFER FROM';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>ERC20 TRANSFER FROM</b> $asset from $sender to $recipient amount $amount",
      (t) => {
        return {
          status: this.status(t),
          asset: this.token(t.to),
          sender: this.account(t.abi.decodedData.params[0].value),
          recipient: this.account(t.abi.decodedData.params[1].value),
          amount: this.amount(t.abi.decodedData.params[2].value, this.ethBlockExplorerService.tokenInfoCache[t.to])
        }
      }
    );
    key = this.TYPE_ETHERDELTA_DEPOSIT_TOKEN
    this.transactionTypes[key] = 'DELTA DEPOSIT';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA DEPOSIT</b> Deposit $amount $token",
      (t) => {
        return {
          status: this.status(t),
          token: this.token(t.abi.decodedData.params[0].value),
          amount: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_WITHDRAWAL
    this.transactionTypes[key] = 'DELTA WITHDRAW';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA WITHDRAW</b> Withdraw $amount",
      (t) => {
        return {
          status: this.status(t),
          amount: this.amount(t.abi.decodedData.params[0].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_WITHDRAWAL_TOKEN
    this.transactionTypes[key] = 'DELTA WITHDRAW TOKEN';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA WITHDRAW TOKEN</b> Withdraw $amount $token",
      (t) => {
        return {
          status: this.status(t),
          token: this.token(t.abi.decodedData.params[0].value),
          amount: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_ORDER
    this.transactionTypes[key] = 'DELTA ORDER';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA ORDER</b> Order get $amountGet $tokenGet pay $amountGive $tokenGive",
      (t) => {
        return {
          status: this.status(t),
          tokenGet: this.token(t.abi.decodedData.params[0].value),
          amountGet: this.amount(t.abi.decodedData.params[1].value),
          tokenGive: this.token(t.abi.decodedData.params[2].value),
          amountGive: this.amount(t.abi.decodedData.params[3].value),
          expires: t.abi.decodedData.params[4].value
        }
      }
    );
    key = this.TYPE_ETHERDELTA_TRADE
    this.transactionTypes[key] = 'DELTA TRADE';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA TRADE</b> Trade get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount",
      (t) => {
        return {
          status: this.status(t),
          tokenGet: this.token(t.abi.decodedData.params[0].value),
          amountGet: this.amount(t.abi.decodedData.params[1].value),
          tokenGive: this.token(t.abi.decodedData.params[2].value),
          amountGive: this.amount(t.abi.decodedData.params[3].value),
          expires: t.abi.decodedData.params[4].value,
          user: this.account(t.abi.decodedData.params[6].value),
          amount: this.amount(t.abi.decodedData.params[10].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_TRADE_BALANCES
    this.transactionTypes[key] = 'DELTA TRADE BALANCES';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA TRADE BALANCES</b> Trade balances get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount",
      (t) => {
        return {
          status: this.status(t),
          tokenGet: this.token(t.abi.decodedData.params[0].value),
          amountGet: this.amount(t.abi.decodedData.params[1].value),
          tokenGive: this.token(t.abi.decodedData.params[2].value),
          amountGive: this.amount(t.abi.decodedData.params[3].value),
          user: this.account(t.abi.decodedData.params[4].value),
          amount: this.amount(t.abi.decodedData.params[5].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_CANCEL_ORDER
    this.transactionTypes[key] = 'DELTA CANCEL ORDER';
    this.renderers[key] = new EthTransactionRenderHelper(
      "$status<b>DELTA CANCEL ORDER</b> Trade get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount",
      (t) => {
        return {
          status: this.status(t),
          tokenGet: this.token(t.abi.decodedData.params[0].value),
          amountGet: this.amount(t.abi.decodedData.params[1].value),
          tokenGive: this.token(t.abi.decodedData.params[2].value),
          amountGive: this.amount(t.abi.decodedData.params[3].value),
          expires: t.abi.decodedData.params[4].value
        }
      }
    );
  }

  renderTransactionType(transaction: EthplorerAddressTransactionExtended): string {
    // let key = `${transaction.type}:${transaction.subtype}`;
    // return this.transactionTypes[key] || key;
    return 'txn type'
  }

  renderAmount(transaction: EthplorerAddressTransactionExtended): string|angular.IPromise<string> {
    return this.amount(transaction.value)
  }

  /* Returns HTML */
  renderedToFrom(transaction: EthplorerAddressTransactionExtended): string {
    return transaction.from.toUpperCase() == this.provider.account.toUpperCase()
        ? transaction.to
        : transaction.from;
  }

  // formatAmount(amount: string, symbol: string, neg: boolean): string {
  //   let returns = this.amount(amount, 8, symbol);
  //   return (neg?'-':'+') + returns;
  // }

  isOutgoing(transaction: EthplorerAddressTransactionExtended): boolean {
    return transaction.from.toUpperCase() == this.provider.account.toUpperCase();
  }

  renderInfo(transaction: EthplorerAddressTransactionExtended) {
    let key = this.TYPE_ETHEREUM_TRANSFER
    if (transaction.abi && transaction.abi.decodedData) {
      key = transaction.abi.decodedData.name
    }
    var renderer = this.renderers[key];
    if (renderer)
      return renderer.render(transaction);
    return `not supported ${key}`;
  }

  account(account: string): string {
    if (!account) return
    let url = this.ethBlockExplorerService.getAddressInfoUrl(account)
    let s = account.toUpperCase() == this.provider.account.toUpperCase() ? "Myself" : account
    return `<a target="_blank" rel="noopener noreferrer" href="${url}">${s}</a>`
  }

  token(address: string) {
    let tokenInfo = this.ethBlockExplorerService.tokenInfoCache[address]
    let url = this.ethBlockExplorerService.getAddressInfoUrl(address)
    let s = tokenInfo ? tokenInfo.symbol : address
    return `<a target="_blank" rel="noopener noreferrer" href="${url}">${s}</a>`
  }

  amount(amount: string, tokenInfo?: EthplorerTokenInfo) {
    let str;
    amount = (amount+"") || "0"
    if (tokenInfo) {
      str = utils.formatQNT(amount, tokenInfo.decimals) + ' ' + tokenInfo.symbol
    }
    else {
      str = utils.commaFormat(amount).replace(/(\.\d*?[1-9])0+$/g, "$1" ) + ' ETH'
    }
    return `<span>${str}</span>`;
  }

  private status(t: EthplorerAddressTransactionExtended) {
    // status 1 OK, 0 Fail, -1 pending
    if (t.ethereumSpecific) {
      if (t.ethereumSpecific.status == 0) return "<span class='failed'>[FAILED] </span>"
      if (t.ethereumSpecific.status == -1) return "<span class='pending'>[PENDING] </span>"
    }
    return ""
  }
}
