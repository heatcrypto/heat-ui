///<reference path='VirtualRepeatComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Heat Ledger Ltd.
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
  selector: 'virtualRepeatPayments',
  inputs: ['account', 'block', 'personalize', 'hideLabel'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <div class="truncate-col height-col left">Height</div>
          <div class="truncate-col date-col left">Time</div>
          <div class="truncate-col name-col left">Sender</div>
          <div class="truncate-col name-col left">Recipient</div>
          <div class="truncate-col asset-col left">Currency/Asset</div>
          <div class="truncate-col amount-col">Amount</div>
          <div class="truncate-col json-col"></div>
        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <div class="truncate-col height-col left">{{item.height}}</div>

            <div class="truncate-col date-col left">{{item.time}}</div>

            <div class="truncate-col name-col left">{{item.senderPublicName||item.sender}}</div>

            <div class="truncate-col name-col left">{{item.recipientPublicName||item.recipient}}</div>

            <div class="truncate-col asset-col left">{{item.assetInfo.symbol}}</div>

            <div class="truncate-col amount-col">{{item.amount}}</div>

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

@Inject('$scope', '$q', 'heat', 'explorerPaymentsProviderFactory', 'settings', 'assetInfo')
class VirtualRepeatPaymentsComponent extends VirtualRepeatComponent {

  account: string; // @input
  block: string; // @input
  personalize: boolean; // @input

  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private heat: HeatService,
    private explorerPaymentsProviderFactory: ExplorerPaymentsProviderFactory,
    private settings: SettingsService,
    private assetInfo: AssetInfoService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.explorerPaymentsProviderFactory.createProvider(this.account),
      /* decorator function */
      (payment: any | IHeatPayment) => {
        let date = utils.timestampToDate(payment.timestamp);
        payment.time = dateFormat(date, format);
        payment.assetInfo = this.asset(payment.currency);
        let decimals = payment.assetInfo.decimals;
        payment.amount = (payment.quantity / (Math.pow(10, decimals))).toFixed(decimals);
      });

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    if (angular.isUndefined(this.account)) {
      heat.subscriber.blockPopped({}, refresh, $scope);
      heat.subscriber.blockPushed({}, refresh, $scope);
    }
  }

  asset(asset: string) {
    if (this.assetInfo.cache[asset] && this.assetInfo.cache[asset].symbol)
      return this.assetInfo.cache[asset];
    else
      this.assetInfo.getInfo(asset);
  }

  jsonDetails($event, item: IHeatPayment) {
    let title = item.isAtomicTransfer ? "Payment (multi transfer): " : "Payment: ";
    dialogs.jsonDetails($event, item, title + "transaction " + item.transaction);
  }

  onSelect(selectedTrade) { }
}
