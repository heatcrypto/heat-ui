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
              <span>{{item.heightDisplay}}</span>
            </div>

            <!-- ID -->
            <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">
              {{item.hash}}
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
              <span class="virtual-repeat-transactions-message" ng-if="item.messageText">
                <md-button ng-click="vm.showPopup(item.messageText)" class="md-icon-button" md-no-ink>
                  <md-icon md-font-library="material-icons">message</md-icon>
                </md-button>
                <code>{{item.messagePreview}}</code>
              </span>
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

  //renderer: EthTransactionRenderer = new EthTransactionRenderer(this);

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
          //let amountVal = this.renderer.renderAmount(transaction);
          let amountVal = transaction.value
          transaction['renderedAmount'] = amountVal;
          //transaction['renderedToFrom'] = this.renderer.renderedToFrom(transaction);
        }

        transaction['renderedInfo'] = this.renderSync(transaction)
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

  renderSync(transaction: IEtherscanTransaction) {
    try {
      return this.web3.parseInput(transaction.input)
    } catch (e) {
      console.log(e)
    }
  }

  onSelect(selectedTransaction) {}
}

// class EthTransactionRenderer {

//   private $q: angular.IQService;
//   private renderers: IStringHashMap<TransactionRenderHelper> = {};
//   private transactionTypes: IStringHashMap<string> = {};

//   constructor(private provider?: {account?: string, personalize: boolean}) {
//     let key;
//     this.$q = <angular.IQService> heat.$inject.get('$q');
//     key = this.TYPE_PAYMENT+":"+this.SUBTYPE_PAYMENT_ORDINARY_PAYMENT;
//     this.transactionTypes[key] = 'TRANSFER HEAT';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ? '' : '<b>TRANSFER HEAT</b> From $sender to $recipient amount $amount'
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           amount: this.amount(t.amount, 8, "HEAT"),
//           recipient: this.account(t.recipient, t.recipientPublicName)
//         }
//       }
//     );
//     key = this.TYPE_MESSAGING+":"+this.SUBTYPE_MESSAGING_ARBITRARY_MESSAGE;
//     this.transactionTypes[key] = 'SEND MESSAGE';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ? '' : '<b>SEND MESSAGE</b> From $sender to $recipient'
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           recipient: this.account(t.recipient, t.recipientPublicName)
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_ISSUANCE;
//     this.transactionTypes[key] = 'ISSUE ASSET';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ? 'Asset $asset' : "<b>ISSUE ASSET</b> Issuer $sender asset $asset";
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           asset: t.transaction
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_TRANSFER;
//     this.transactionTypes[key] = 'TRANSFER ASSET';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ? '' : "<b>TRANSFER ASSET</b> $asset from $sender to $recipient amount $amount";
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           recipient: this.account(t.recipient, t.recipientPublicName),
//           asset: this.asset(t.attachment['asset']),
//           amount: this.amount(t.attachment['quantity'], 8),
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT;
//     this.transactionTypes[key] = 'SELL ORDER';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ?
//           '$currency/$asset amount $amount price $price' :
//           "<b>SELL ORDER</b> $sender placed sell order $currency/$asset amount $amount price $price";
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           currency: this.asset(t.attachment['currency']),
//           asset: this.asset(t.attachment['asset']),
//           amount: this.amount(t.attachment['quantity'], 8),
//           price: this.amount(t.attachment['price'], 8),
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT;
//     this.transactionTypes[key] = 'BUY ORDER';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ?
//           '$currency/$asset amount $amount price $price' :
//           "<b>BUY ORDER</b> $sender placed buy order $currency/$asset amount $amount price $price";
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           currency: this.asset(t.attachment['currency']),
//           asset: this.asset(t.attachment['asset']),
//           amount: this.amount(t.attachment['quantity'], 8),
//           price: this.amount(t.attachment['price'], 8),
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_CANCELLATION;
//     this.transactionTypes[key] = 'CANCEL SELL';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ?
//           '$currency/$asset amount $amount price $price':
//           '<b>CANCEL SELL</b> $sender cancelled order $currency/$asset amount $amount price $price';
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           order: t.attachment['order'],
//           currency: this.asset(t['cancelledAskCurrency']),
//           asset: this.asset(t['cancelledAskAsset']),
//           amount: this.amount(t['cancelledAskQuantity'], 8),
//           price: this.amount(t['cancelledAskPrice'], 8)
//         }
//       }
//     );
//     key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_CANCELLATION;
//     this.transactionTypes[key] = 'CANCEL BUY';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ?
//           '$currency/$asset amount $amount price $price':
//           '<b>CANCEL BUY</b> $sender cancelled order $currency/$asset amount $amount price $price';
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           order: t.attachment['order'],
//           currency: this.asset(t['cancelledBidCurrency']),
//           asset: this.asset(t['cancelledBidAsset']),
//           amount: this.amount(t['cancelledBidQuantity'], 8),
//           price: this.amount(t['cancelledBidPrice'], 8)
//         }
//       }
//     );
//     key = this.TYPE_ACCOUNT_CONTROL+":"+this.SUBTYPE_ACCOUNT_CONTROL_EFFECTIVE_BALANCE_LEASING;
//     this.transactionTypes[key] = 'BALANCE LEASE';
//     this.renderers[key] = new TransactionRenderHelper(
//       (t) => {
//         return provider.personalize ? 'Lease balance for $period blocks':"<b>BALANCE LEASE</b> From $sender to $recipient for $period blocks";
//       },
//       (t) => {
//         return {
//           sender: this.account(t.sender, t.senderPublicName),
//           recipient: this.account(t.recipient, t.recipientPublicName),
//           period: utils.commaFormat(t.attachment['period'].toString())
//         }
//       }
//     );
//   }

//   renderTransactionType(transaction: IHeatTransaction): string {
//     let key = `${transaction.type}:${transaction.subtype}`;
//     return this.transactionTypes[key] || key;
//   }

//   renderAmount(transaction: IHeatTransaction): string|angular.IPromise<string> {
//     if (transaction.type == this.TYPE_PAYMENT && transaction.subtype == this.SUBTYPE_PAYMENT_ORDINARY_PAYMENT) {
//       let amount:string = transaction.amount;
//       let symbol:string = 'HEAT';
//       let neg:boolean = transaction.sender == this.provider.account;
//       return this.formatAmount(amount, symbol, neg);
//     }
//     if (transaction.type == this.TYPE_COLORED_COINS) {
//       let amount: string = null;
//       let neg: boolean = null;
//       let currency: string = null;
//       switch (transaction.subtype) {
//         case this.SUBTYPE_COLORED_COINS_ASSET_ISSUANCE:
//         case this.SUBTYPE_COLORED_COINS_ASSET_ISSUE_MORE: {
//           amount = transaction.attachment['quantity'];
//           currency = transaction.transaction;
//           break;
//         }
//         case this.SUBTYPE_COLORED_COINS_ASSET_TRANSFER: {
//           amount = transaction.attachment['quantity'];
//           neg = transaction.sender == this.provider.account;
//           currency = transaction.attachment['asset'];
//           break;
//         }
//         case this.SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT: {
//           amount = transaction.attachment['quantity'];
//           currency = transaction.attachment['asset'];
//           neg = true;
//           break;
//         }
//         case this.SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT: {
//           amount = utils.calculateTotalOrderPriceQNT(transaction.attachment['quantity'], transaction.attachment['price']);
//           currency = transaction.attachment['currency'];
//           neg = true;
//           break;
//         }
//       }
//       if (angular.isString(amount)) {
//         if (angular.isDefined(this.assetInfo.cache[currency])) {
//           let symbol = this.assetInfo.cache[currency].symbol;
//           if (angular.isString(symbol)) {
//             return this.formatAmount(amount, symbol, neg);
//           }
//         }
//         let deferred = this.$q.defer<string>();
//         this.assetInfo.getInfo(currency).then(info=>{
//           deferred.resolve(this.formatAmount(amount, info.symbol, neg))
//         }, deferred.reject);
//         return deferred.promise;
//       }
//     }
//   }

//   /* Returns HTML */
//   renderedToFrom(transaction: IEtherscanTransaction): string {
//     if (transaction.from == this.provider.account) {
//       return this.account(transaction.to);
//     }
//     return this.account(transaction.from);
//   }

//   formatAmount(amount: string, symbol: string, neg: boolean): string {
//     let returns = this.amount(amount, 8, symbol);
//     return (neg?'-':'+') + returns;
//   }

//   isOutgoing(transaction: IHeatTransaction): boolean {
//     return transaction.sender == this.provider.account;
//   }

//   account(account: string): string {
//     return account == '0' ? '' : `<a href="#/ethereum-account/${account}">${account}</a>`;
//   }

//   amount(amountHQT: string, decimals: number, symbol?: string) {
//     return `<span>${utils.formatQNT(amountHQT||"0", decimals)} ${symbol||""}</span>`;
//   }

//   asset(asset:string) {
//     if (asset=="5592059897546023466")
//       return "<b>BTC</b>"
//     if (asset=="0")
//       return "<b>HEAT</b>";
//     if (this.assetInfo.cache[asset] && this.assetInfo.cache[asset].symbol)
//       return this.assetInfo.cache[asset].symbol;
//     else
//       this.assetInfo.getInfo(asset);
//     return asset;
//   }
// }
