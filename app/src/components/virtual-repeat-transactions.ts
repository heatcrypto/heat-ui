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
  selector: 'virtualRepeatTransactions',
  inputs: ['account','block','personalize','transactionObject'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- HEIGHT -->
          <div class="truncate-col height-col left" ng-if="!vm.personalize">Height</div>

          <!-- ID -->
          <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">Id</div>

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- INOUT -->
          <div class="truncate-col inoutgoing-col left" ng-if="vm.personalize">In/Out</div>

          <!-- TRANSACTION -->
          <div class="truncate-col transaction-col left" ng-if="vm.personalize">Transaction</div>

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
            <div class="truncate-col height-col left" ng-if="!vm.personalize">
              <elipses-loading ng-show="item.height==2147483647"></elipses-loading>
              <span ng-show="item.height!=2147483647">{{item.height}}</span>
            </div>

            <!-- ID -->
            <div class="truncate-col id-col left" ng-if="vm.personalize || vm.account">
              {{item.transaction}}
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
            <div class="truncate-col transaction-col left" ng-if="vm.personalize">
              <span ng-bind-html="item.renderedTransactionType"></span>
            </div>

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
@Inject('$scope','$q','heat','transactionsProviderFactory','settings','user','render','$mdPanel','controlCharRender')
class VirtualRepeatTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  block: string; // @input
  personalize: boolean; // @input
  transactionObject: IHeatTransaction; // @input

  renderer: TransactionRenderer = new TransactionRenderer(this);

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private heat: HeatService,
              private transactionsProviderFactory: TransactionsProviderFactory,
              private settings: SettingsService,
              private user: UserService,
              private render: RenderService,
              private $mdPanel: angular.material.IPanelService,
              private controlCharRender: ControlCharRenderService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.transactionsProviderFactory.createProvider(this.account, this.block, this.transactionObject),
      /* decorator function */
      (transaction: any|IHeatTransaction) => {
        let date = utils.timestampToDate(transaction.timestamp);
        transaction.time = dateFormat(date, format);
        transaction.heightDisplay = transaction.height==2147483647?'*':transaction.height;
        if (this.personalize) {
          // order cancellations display as incoming
          if (transaction.type == 2 && (transaction.subtype == 5 || transaction.subtype == 6)) {
            transaction['outgoing'] = false;
          }
          else {
            transaction['outgoing'] = this.user.account == transaction.sender;
          }

          transaction['renderedTransactionType'] = this.renderer.renderTransactionType(transaction);
          let amountVal = this.renderer.renderAmount(transaction);
          if (angular.isString(amountVal)) {
            transaction['renderedAmount'] = amountVal;
          }
          else if (angular.isObject(amountVal)) {
            amountVal.then(val=>{
              transaction['renderedAmount'] = val;
            });
          }
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
        transaction['messageText'] = this.heat.getHeatMessageContents(transaction);
        if (angular.isString(transaction['messageText'])) {
          let messagePreview = transaction['messageText'].substr(0, 50);
          if (transaction['messageText'].length > 50) {
            messagePreview += " ...";
          }
          transaction['messagePreview'] = messagePreview;
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    if (angular.isString(this.account)) {
      heat.subscriber.unconfirmedTransaction({recipient:this.account}, refresh, $scope);
      heat.subscriber.unconfirmedTransaction({sender:this.account}, refresh, $scope);
    }
    if (angular.isUndefined(this.block)&&angular.isUndefined(this.account)) {
      heat.subscriber.unconfirmedTransaction({}, refresh, $scope);
      heat.subscriber.blockPopped({}, refresh, $scope);
      heat.subscriber.blockPushed({}, refresh, $scope);
    }

    $scope.$on("$destroy",() => {
      if (this.provider) {
        this.provider.destroy();
      }
    });
  }

  showPopup(messageText: string) {
    let renderedHTML = this.render.render(messageText, [this.controlCharRender]);
    let position = this.$mdPanel.newPanelPosition().absolute().center();
    let config :angular.material.IPanelConfig = {
      attachTo: angular.element(document.body),
      controller: function () {},
      controllerAs: 'vm',
      disableParentScroll: true,
      template: `
        <div class="virtual-repeat-transactions-message-contents" ng-bind-html="vm.renderedHTML"></div>
      `,
      hasBackdrop: true,
      panelClass: 'demo-dialog-example',
      position: position,
      trapFocus: true,
      zIndex: 150,
      clickOutsideToClose: true,
      escapeToClose: true,
      focusOnOpen: true,
      locals: {
        renderedHTML: renderedHTML
      }
    };
    this.$mdPanel.open(config);
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: '+item.transaction);
  }

  onSelect(selectedTransaction) {}
}

interface TemplateFunction {
  (transaction: IHeatTransaction):string;
}

class TransactionRenderHelper {
  private $q: angular.IQService;
  constructor(private template: string|TemplateFunction,
              private extractor: (transaction: IHeatTransaction)=>Object) {
    this.$q = <angular.IQService> heat.$inject.get('$q');
  }

  private isPromise(val) {
    return angular.isObject(val) && angular.isFunction(val['then']);
  }

  public render(transaction: IHeatTransaction): angular.IPromise<string>|string {
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
      var deferred = this.$q.defer();
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

class TransactionRenderer {

  private TYPE_PAYMENT = 0;
  private TYPE_MESSAGING = 1;
  private TYPE_COLORED_COINS = 2;
  private TYPE_ACCOUNT_CONTROL = 4;
  private SUBTYPE_PAYMENT_ORDINARY_PAYMENT = 0;
  private SUBTYPE_MESSAGING_ARBITRARY_MESSAGE = 0;
  private SUBTYPE_COLORED_COINS_ASSET_ISSUANCE = 0;
  private SUBTYPE_COLORED_COINS_ASSET_ISSUE_MORE = 1;
  private SUBTYPE_COLORED_COINS_ASSET_TRANSFER = 2;
  private SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT = 3;
  private SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT = 4;
  private SUBTYPE_COLORED_COINS_ASK_ORDER_CANCELLATION = 5;
  private SUBTYPE_COLORED_COINS_BID_ORDER_CANCELLATION = 6;
  private SUBTYPE_COLORED_COINS_WHITELIST_ACCOUNT_ADDITION = 7;
  private SUBTYPE_COLORED_COINS_WHITELIST_ACCOUNT_REMOVAL = 8;
  private SUBTYPE_COLORED_COINS_WHITELIST_MARKET = 9;
  private SUBTYPE_ACCOUNT_CONTROL_EFFECTIVE_BALANCE_LEASING = 0;

  private heat: HeatService;
  private assetInfo: AssetInfoService;
  private $q: angular.IQService;
  private renderers: IStringHashMap<TransactionRenderHelper> = {};
  private transactionTypes: IStringHashMap<string> = {};

  constructor(private provider?: {account?: string, block?: string, personalize: boolean}) {
    let key;
    this.heat = <HeatService> heat.$inject.get('heat');
    this.assetInfo = <AssetInfoService> heat.$inject.get('assetInfo');
    this.$q = <angular.IQService> heat.$inject.get('$q');
    key = this.TYPE_PAYMENT+":"+this.SUBTYPE_PAYMENT_ORDINARY_PAYMENT;
    this.transactionTypes[key] = 'TRANSFER HEAT';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? '' : '<b>TRANSFER HEAT</b> From $sender to $recipient amount $amount'
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          amount: this.amount(t.amount, 8, "HEAT"),
          recipient: this.account(t.recipient, t.recipientPublicName)
        }
      }
    );
    key = this.TYPE_MESSAGING+":"+this.SUBTYPE_MESSAGING_ARBITRARY_MESSAGE;
    this.transactionTypes[key] = 'SEND MESSAGE';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? '' : '<b>SEND MESSAGE</b> From $sender to $recipient'
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          recipient: this.account(t.recipient, t.recipientPublicName)
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_ISSUANCE;
    this.transactionTypes[key] = 'ISSUE ASSET';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? 'Asset $asset' : "<b>ISSUE ASSET</b> Issuer $sender asset $asset";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          asset: t.transaction
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_TRANSFER;
    this.transactionTypes[key] = 'TRANSFER ASSET';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? '' : "<b>TRANSFER ASSET</b> $asset from $sender to $recipient amount $amount";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          recipient: this.account(t.recipient, t.recipientPublicName),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT;
    this.transactionTypes[key] = 'SELL ORDER';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ?
          '$currency/$asset amount $amount price $price' :
          "<b>SELL ORDER</b> $sender placed sell order $currency/$asset amount $amount price $price";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          currency: this.asset(t.attachment['currency']),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
          price: this.amount(t.attachment['price'], 8),
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT;
    this.transactionTypes[key] = 'BUY ORDER';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ?
          '$currency/$asset amount $amount price $price' :
          "<b>BUY ORDER</b> $sender placed buy order $currency/$asset amount $amount price $price";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          currency: this.asset(t.attachment['currency']),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
          price: this.amount(t.attachment['price'], 8),
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_CANCELLATION;
    this.transactionTypes[key] = 'CANCEL SELL';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? 'Sell order $order':"<b>CANCEL SELL</b> $sender cancelled sell order $order";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          order: t.attachment['order']
        }
      }
    );
    key = this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_CANCELLATION;
    this.transactionTypes[key] = 'CANCEL BUY';
    this.renderers[key] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? 'Buy order $order':"<b>CANCEL BUY</b> $sender cancelled buy order $order";
      },
      (t) => {
        return {
          sender: this.account(t.sender, t.senderPublicName),
          order: t.attachment['order']
        }
      }
    );
  }

  renderTransactionType(transaction: IHeatTransaction): string {
    let key = `${transaction.type}:${transaction.subtype}`;
    return this.transactionTypes[key] || key;
  }

  renderAmount(transaction: IHeatTransaction): string|angular.IPromise<string> {
    if (transaction.type == this.TYPE_PAYMENT && transaction.subtype == this.SUBTYPE_PAYMENT_ORDINARY_PAYMENT) {
      let amount:string = transaction.amount;
      let symbol:string = 'HEAT';
      let neg:boolean = transaction.sender == this.provider.account;
      return this.formatAmount(amount, symbol, neg);
    }
    if (transaction.type == this.TYPE_COLORED_COINS) {
      let amount: string = null;
      let neg: boolean = null;
      let currency: string = null;
      switch (transaction.subtype) {
        case this.SUBTYPE_COLORED_COINS_ASSET_ISSUANCE:
        case this.SUBTYPE_COLORED_COINS_ASSET_ISSUE_MORE: {
          amount = transaction.attachment['quantity'];
          currency = transaction.transaction;
          break;
        }
        case this.SUBTYPE_COLORED_COINS_ASSET_TRANSFER: {
          amount = transaction.attachment['quantity'];
          neg = transaction.sender == this.provider.account;
          currency = transaction.attachment['asset'];
          break;
        }
        case this.SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT: {
          amount = transaction.attachment['quantity'];
          currency = transaction.attachment['asset'];
          neg = true;
          break;
        }
        case this.SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT: {
          amount = utils.calculateTotalOrderPriceQNT(transaction.attachment['quantity'], transaction.attachment['price']);
          currency = transaction.attachment['currency'];
          neg = true;
          break;
        }
      }
      if (angular.isString(amount)) {
        if (angular.isDefined(this.assetInfo.cache[currency])) {
          let symbol = this.assetInfo.cache[currency].symbol;
          if (angular.isString(symbol)) {
            return this.formatAmount(amount, symbol, neg);
          }
        }
        let deferred = this.$q.defer();
        this.assetInfo.getInfo(currency).then(info=>{
          deferred.resolve(this.formatAmount(amount, info.symbol, neg))
        }, deferred.reject);
        return deferred.promise;
      }
    }
  }

  /* Returns HTML */
  renderedToFrom(transaction: IHeatTransaction): string {
    if (transaction.sender == this.provider.account) {
      return this.account(transaction.recipient, transaction.recipientPublicName);
    }
    return this.account(transaction.sender, transaction.senderPublicName);
  }

  formatAmount(amount: string, symbol: string, neg: boolean): string {
    let returns = this.amount(amount, 8, symbol);
    return (neg?'-':'+') + returns;
  }

  isOutgoing(transaction: IHeatTransaction): boolean {
    return transaction.sender == this.provider.account;
  }

  renderInfo(transaction: IHeatTransaction) {
    var renderer = this.renderers[transaction.type+":"+transaction.subtype];
    if (renderer)
      return renderer.render(transaction);
    return `not supported type=${transaction.type} subtype=${transaction.subtype}`;
  }

  account(account: string, publicName: string): string {
    return account == '0' ? '' : `<a href="#/explorer-account/${account}">${publicName||account}</a>`;
  }

  amount(amountHQT: string, decimals: number, symbol?: string) {
    return `<span>${utils.formatQNT(amountHQT||"0", decimals)} ${symbol||""}</span>`;
  }

  asset(asset:string) {
    if (asset=="5592059897546023466")
      return "<b>BTC</b>"
    if (asset=="0")
      return "<b>HEAT</b>";
    return asset;
  }
}
