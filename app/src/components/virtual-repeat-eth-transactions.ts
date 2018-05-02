///<reference path='VirtualRepeatComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- HEIGHT -->
          <div class="he truncate-col height-col left" ng-if="!vm.personalize">Height</div>

          <!-- ID -->
          <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">Id</div>

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- INOUT -->
          <div class="truncate-col inoutgoing-col left" ng-if="vm.personalize">In/Out</div>

          <!-- TRANSACTION -->
          <!-- <div class="truncate-col transaction-col left" ng-if="vm.personalize">Transaction</div> -->

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left" ng-if="vm.personalize">Amount</div>

          <!-- TOFROM -->
          <div class="truncate-col tofrom-col left" ng-if="vm.personalize">To/From</div>

          <!-- INFO -->
          <div class="truncate-col info-col left" flex>Info</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- HEIGHT -->
            <div class="he truncate-col height-col left" ng-if="!vm.personalize">
              <!--<elipses-loading ng-show="item.height==2147483647"></elipses-loading>
              <span ng-show="item.height!=2147483647">{{item.heightDisplay}}</span>-->
              <span>
                <a target="_blank" href="https://etherscan.io/block/{{item.heightDisplay}}">{{item.heightDisplay}}</a>
              </span>
            </div>

            <!-- ID -->
            <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">
              <a target="_blank" href="https://etherscan.io/tx/{{item.hash}}">{{item.hash}}</a>
            </div>

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- INOUT -->
            <div class="truncate-col inoutgoing-col left" ng-if="vm.personalize">
              <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing}">
                {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
              </md-icon>
            </div>

            <!-- TRANSACTION -->
            <!-- <div class="truncate-col transaction-col left" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedTransactionType"></span>
            </div> -->

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedAmount"></span>
            </div>

            <!-- TOFROM -->
            <div class="truncate-col tofrom-col left" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedToFrom"></span>
            </div>

            <!-- INFO -->
            <div class="truncate-col info-col left" flex>
              <span ng-bind-html="item.renderedInfo"></span>
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

@Inject('$scope','$q','ethTransactionsProviderFactory','settings','user','render','$mdPanel','controlCharRender','web3')
class VirtualRepeatEthTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  personalize: boolean; // @input

  renderer: EthTransactionRenderer = new EthTransactionRenderer(this);

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private ethTransactionsProviderFactory: EthTransactionsProviderFactory,
              private settings: SettingsService,
              private user: UserService,
              private render: RenderService,
              private $mdPanel: angular.material.IPanelService,
              private controlCharRender: ControlCharRenderService,
              private web3: Web3Service) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.ethTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: IEtherscanTransaction) => {
        var date = new Date(0); // 0 sets date to epoch time
        date.setUTCSeconds(<any>transaction.timeStamp);
        transaction['time'] = dateFormat(date, format);
        transaction['heightDisplay'] = transaction.blockNumber
        if (this.personalize) {
          transaction['outgoing'] = this.user.account == transaction.from;

          //transaction['renderedTransactionType'] = this.renderer.renderTransactionType(transaction);
          let amountVal = this.renderer.renderAmount(transaction);
          transaction['renderedAmount'] = amountVal;
          transaction['renderedToFrom'] = this.renderer.renderedToFrom(transaction);
        }

        let renderedInfo = this.renderer.renderInfo(transaction);
        if (angular.isString(renderedInfo)) {
          transaction['renderedInfo'] = renderedInfo;
        }
        else if (angular.isObject(renderedInfo)) {
          renderedInfo.then((text)=>{
            transaction['renderedInfo'] = text;
          })
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);

    // TODO call refresh once in a while
  }

  timeStampToDateTimeString(timeStamp) {
    var utcSeconds = timeStamp;
    var date = new Date(0); // 0 sets date to epoch time
    date.setUTCSeconds(utcSeconds);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: '+item.transaction);
  }

  imageUrl(contractAddress: string) {
    return `https://raw.githubusercontent.com/dmdeklerk/tokens/master/images/${contractAddress}.png`
  }

  renderSync(transaction: IEtherscanTransaction) {
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
  (transaction: IHeatTransaction):string;
}

class EthTransactionRenderHelper {
  private $q: angular.IQService;
  constructor(private template: string|EthTemplateFunction,
              private extractor: (transaction: IEtherscanTransaction)=>Object) {
    this.$q = <angular.IQService> heat.$inject.get('$q');
  }

  private isPromise(val) {
    return angular.isObject(val) && angular.isFunction(val['then']);
  }

  public render(transaction: IEtherscanTransaction): angular.IPromise<string>|string {
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

  constructor(private provider?: {account?: string, personalize: boolean}) {
    let key;
    this.$q = <angular.IQService> heat.$inject.get('$q');
    this.ethTransactionParser = <EthTransactionParserService> heat.$inject.get('ethTransactionParser');
    key = this.TYPE_ETHEREUM_TRANSFER;
    this.transactionTypes[key] = 'TRANSFER';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return '<b>TRANSFER</b> Transfer $amount ETH from $from to $to'
      },
      (t) => {
        return {
          from: this.account(t.from),
          to: this.account(t.to),
          amount: this.amount(t.value)
        }
      }
    );
    key = this.TYPE_ERC20_APPROVE;
    this.transactionTypes[key] = 'ERC20 APPROVE';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return '<b>ERC20 APPROVE</b> $from $to $spender $value'
      },
      (t) => {
        return {
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
      (t) => {
        return "<b>ERC20 TRANSFER</b> Send $value $token from $from to $to";
      },
      (t) => {
        return {
          token: this.token(t.to),
          from: this.account(t.from),
          to: this.account(t.abi.decodedData.params[0].value),
          value: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ERC20_TRANSFER_FROM
    this.transactionTypes[key] = 'ERC20 TRANSFER FROM';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return "<b>ERC20 TRANSFER FROM</b> $asset from $sender to $recipient amount $amount";
      },
      (t) => {
        return {
          token: this.token(t.to),
          from: this.account(t.from),
          to: this.account(t.abi.decodedData.params[0].value),
          value: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_DEPOSIT_TOKEN
    this.transactionTypes[key] = 'DELTA DEPOSIT';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return "<b>DELTA DEPOSIT</b> Deposit $amount $token";
      },
      (t) => {
        return {
          token: this.token(t.abi.decodedData.params[0].value),
          amount: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_WITHDRAWAL
    this.transactionTypes[key] = 'DELTA WITHDRAW';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return "<b>DELTA WITHDRAW</b> Withdraw $amount";
      },
      (t) => {
        return {
          amount: this.amount(t.abi.decodedData.params[0].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_WITHDRAWAL_TOKEN
    this.transactionTypes[key] = 'DELTA WITHDRAW TOKEN';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return "<b>DELTA WITHDRAW TOKEN</b> Withdraw $amount $token";
      },
      (t) => {
        return {
          token: this.token(t.abi.decodedData.params[0].value),
          amount: this.amount(t.abi.decodedData.params[1].value)
        }
      }
    );
    key = this.TYPE_ETHERDELTA_ORDER
    this.transactionTypes[key] = 'DELTA ORDER';
    this.renderers[key] = new EthTransactionRenderHelper(
      (t) => {
        return "<b>DELTA ORDER</b> Order get $amountGet $tokenGet pay $amountGive $tokenGive";
      },
      (t) => {
        return {
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
      (t) => {
        return "<b>DELTA TRADE</b> Trade get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount";
      },
      (t) => {
        return {
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
      (t) => {
        return "<b>DELTA TRADE BALANCES</b> Trade balances get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount";
      },
      (t) => {
        return {
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
      (t) => {
        return "<b>DELTA CANCEL ORDER</b> Trade get $amountGet $tokenGet pay $amountGive $tokenGive from $user amount $amount";
      },
      (t) => {
        return {
          tokenGet: this.token(t.abi.decodedData.params[0].value),
          amountGet: this.amount(t.abi.decodedData.params[1].value),
          tokenGive: this.token(t.abi.decodedData.params[2].value),
          amountGive: this.amount(t.abi.decodedData.params[3].value),
          expires: t.abi.decodedData.params[4].value
        }
      }
    );
  }

  renderTransactionType(transaction: IEtherscanTransaction): string {
    // let key = `${transaction.type}:${transaction.subtype}`;
    // return this.transactionTypes[key] || key;
    return 'txn type'
  }

  renderAmount(transaction: IEtherscanTransaction): string|angular.IPromise<string> {
    return transaction.value
  }

  /* Returns HTML */
  renderedToFrom(transaction: IEtherscanTransaction): string {
    if (transaction.from == this.provider.account) {
      return this.account(transaction.to);
    }
    return this.account(transaction.from);
  }

  // formatAmount(amount: string, symbol: string, neg: boolean): string {
  //   let returns = this.amount(amount, 8, symbol);
  //   return (neg?'-':'+') + returns;
  // }

  isOutgoing(transaction: IEtherscanTransaction): boolean {
    return transaction.from == this.provider.account;
  }

  renderInfo(transaction: IEtherscanTransaction) {
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
    if (account == this.provider.account) {
      return `<u>${account}</u>`
    }
    return `<a target="_blank" href="https://etherscan.io/address/${account}">${account}</a>`;
  }

  token(address: string) {
    return this.ethTransactionParser.loadEthTokens().then(tokens => {
      if (tokens[address]) {
        return `<a target="_blank" href="https://etherscan.io/address/${address}">${tokens[address].symbol}</a>`;
      }
      return `<a target="_blank" href="https://etherscan.io/address/${address}">${address}</a>`;
    })
  }

  amount(amount: string, decimals?: number, symbol?: string) {
    return `<span>${amount}</span>`;
  }
}
