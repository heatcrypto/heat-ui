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
  inputs: ['account','block','personalize'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <div class="truncate-col height-col left">Height</div>
          <div class="truncate-col date-col left">Date</div>
          <div class="truncate-col inoutgoing-col" ng-if="vm.personalize"></div>
          <div class="truncate-col render-col left" flex>Transaction</div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <div class="truncate-col height-col left">
              <elipses-loading ng-show="item.height==2147483647"></elipses-loading>
              <span ng-show="item.height!=2147483647">{{item.height}}</span>
            </div>
            <div class="truncate-col date-col left">{{item.time}}</div>
            <div class="truncate-col inoutgoing-col" ng-if="vm.personalize">
              <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing}">
                {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
              </md-icon>
            </div>
            <div class="truncate-col render-col left" flex ng-bind-html="item.rendered"></div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','$q','heat','transactionsProviderFactory','settings','user')
class VirtualRepeatTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input
  block: string; // @input
  personalize: boolean; // @input

  renderer: TransactionRenderer = new TransactionRenderer(this);

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private heat: HeatService,
              private transactionsProviderFactory: TransactionsProviderFactory,
              private settings: SettingsService,
              private user: UserService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.transactionsProviderFactory.createProvider(this.account, this.block),
      /* decorator function */
      (transaction: any|IHeatTransaction) => {
        var date = utils.timestampToDate(transaction.timestamp);
        transaction.time = dateFormat(date, format);
        transaction.heightDisplay = transaction.height==2147483647?'*':transaction.height;
        if (this.personalize) {
          transaction['outgoing'] = this.user.account == transaction.sender;
        }

        var rendered = this.renderer.render(transaction);
        if (angular.isString(rendered)) {
          transaction.rendered = this.renderer.render(transaction);
        }
        else if (angular.isObject(rendered)) {
          rendered.then((text)=>{
            transaction.rendered = text;
          })
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
  private renderers: IStringHashMap<TransactionRenderHelper> = {};

  constructor(private provider?: {account?: string, block?: string, personalize: boolean}) {
    this.heat = <HeatService> heat.$inject.get('heat');
    this.renderers[this.TYPE_PAYMENT+":"+this.SUBTYPE_PAYMENT_ORDINARY_PAYMENT] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? (
          this.isOutgoing(t) ?
            '<b>TRANSFERED</b> $amount to $recipient $message' :
            '<b>RECEIVED</b> $amount from $sender $message'
        ) : '<b>TRANSFER HEAT</b> From $sender to $recipient amount $amount $message'
      },
      (t) => {
        return {
          sender: this.account(t.sender),
          amount: this.amount(t.amount, 8, "HEAT"),
          recipient: this.account(t.recipient),
          message: this.message(t)
        }
      }
    );
    this.renderers[this.TYPE_MESSAGING+":"+this.SUBTYPE_MESSAGING_ARBITRARY_MESSAGE] = new TransactionRenderHelper(
      (t) => {
        return provider.personalize ? (
          this.isOutgoing(t) ?
            '<b>SEND MESSAGE</b> to $recipient $message' :
            '<b>RECEIVED MESSAGE</b> from $sender $message'
        ) : '<b>SEND MESSAGE</b> From $sender to $recipient $message'
      },
      (t) => {
        return {
          sender: this.account(t.sender),
          recipient: this.account(t.recipient),
          message: this.message(t)
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_ISSUANCE] = new TransactionRenderHelper(
      "<b>ISSUE ASSET</b> Issuer $sender asset $asset",
      (t) => {
        return {
          sender: this.account(t.sender),
          asset: t.transaction
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASSET_TRANSFER] = new TransactionRenderHelper(
      "<b>TRANSFER ASSET</b> $asset from $sender to $recipient amount $amount",
      (t) => {
        return {
          sender: this.account(t.sender),
          recipient: this.account(t.recipient),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_PLACEMENT] = new TransactionRenderHelper(
      "<b>SELL ORDER</b> $sender placed sell order $currency/$asset amount $amount price $price",
      (t) => {
        return {
          sender: this.account(t.sender),
          currency: this.asset(t.attachment['currency']),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
          price: this.amount(t.attachment['price'], 8),
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_PLACEMENT] = new TransactionRenderHelper(
      "<b>BUY ORDER</b> $sender placed buy order $currency/$asset amount $amount price $price",
      (t) => {
        return {
          sender: this.account(t.sender),
          currency: this.asset(t.attachment['currency']),
          asset: this.asset(t.attachment['asset']),
          amount: this.amount(t.attachment['quantity'], 8),
          price: this.amount(t.attachment['price'], 8),
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_ASK_ORDER_CANCELLATION] = new TransactionRenderHelper(
      "<b>CANCEL SELL</b> $sender cancelled sell order $order",
      (t) => {
        return {
          sender: this.account(t.sender),
          order: t.attachment['order']
        }
      }
    );
    this.renderers[this.TYPE_COLORED_COINS+":"+this.SUBTYPE_COLORED_COINS_BID_ORDER_CANCELLATION] = new TransactionRenderHelper(
      "<b>CANCEL BUY</b> $sender cancelled buy order $order",
      (t) => {
        return {
          sender: this.account(t.sender),
          order: t.attachment['order']
        }
      }
    );
  }

  isOutgoing(transaction: IHeatTransaction): boolean {
    return transaction.sender == this.provider.account;
  }

  render(transaction: IHeatTransaction) {
    var renderer = this.renderers[transaction.type+":"+transaction.subtype];
    if (renderer)
      return renderer.render(transaction);
    return `not supported type=${transaction.type} subtype=${transaction.subtype}`;
  }

  account(account: string): string {
    return `<a href="#/explorer-account/${account}">${account}</a>`;
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

  message(transaction: IHeatTransaction): string {
    let text = this.heat.getHeatMessageContents(transaction);
    return text ? `<code>${text}</code>` : '';
  }
}
