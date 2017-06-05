///<reference path='AbstractDataTableComponent.ts'/>
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
  selector: 'userPaymentsTable',
  styles: [`
    user-payments-table .confirmed-th {
      text-align: center;
      width: 32px;
    }
    user-payments-table .confirmed-td * {
      font-size: 16px;
    }
    user-payments-table .outgoing {
      color: #f44336 !important;
      font-size: 16px;
    }
    user-payments-table .incoming {
      color: #8BC34A !important;
      font-size: 16px;
    }
    user-payments-table .stretch {
      width: 99%;
    }
    user-payments-table .message-text {
      margin-bottom: 18px;
    }
    user-payments-table .message-text pre {
      margin-top: 0px;
    }
  `],
  template: AbstractDataTableComponent.template(`
      <th md-column class="confirmed-th">
        <span>
          <md-icon md-font-library="material-icons">security</md-icon>
        </span>
      </th>
      <th md-column md-order-by="timestamp">
        <span>Date</span>
      </th>
      <th md-column md-numeric md-order-by="amount">
        <span>Amount</span>
      </th>
      <th md-column></th>
      <th md-column>
        <span>Account</span>
      </th>
      <!--
      <th md-column md-order-by="sender">
        <span>Sender</span>
      </th>
      <th md-column md-order-by="recipient">
        <span>Recipient</span>
      </th>
      -->
      <th md-column class="stretch">
        <span>Message</span>
      </th>
    `,`
      <td md-cell class="confirmed-td">
        <elipses-loading ng-if="!item.confirmed"></elipses-loading>
        <md-icon ng-if="item.confirmed" md-font-library="material-icons">check</md-icon>
      </td>
      <td md-cell nowrap>
        <timestamp timestamp-value="item.timestamp"></timestamp>
      </td>
      <td md-cell md-numeric nowrap>
        <money precision="{{item.decimals}}" amount="item.quantity" symbol="item.symbol"
          outgoing="item.outgoing"></money>
      </td>
      <td md-cell>
        <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing}">
          {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
        </md-icon>
      </td>
      <td md-cell nowrap>
        <span>{{item.account}}</span>
      </td>
      <!--
      <td md-cell nowrap>
        <span>{{item.sender}}</span>
      </td>
      <td md-cell nowrap>
        <span>{{item.recipient}}</span>
      </td>
      -->
      <td md-cell class="stretch">
        <div class="message-text" ng-show="item.messageText"><pre>{{item.messageText}}</pre></div>
      </td>
    `
  )
})
@Inject('$scope','$q','$timeout','user','heat','HTTPNotify','assetInfo')
class UserPaymentsTableComponent extends AbstractDataTableComponent {

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private user: UserService,
              private heat: HeatService,
              private HTTPNotify: HTTPNotifyService,
              private assetInfo: AssetInfoService) {
    super($scope, $q, $timeout, "-timestamp");

    this.HTTPNotify.on(()=>{
      if (this.query.page == 1) {
        this.refresh();
      }
    }, $scope);

    this.refresh();
  }

  getCount() : angular.IPromise<number> {
    return this.heat.api.getPaymentsCount(this.user.account,'all');
  }

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<IHeatPayment>> {
    var deferred = this.$q.defer();
    this.createGetPaymentsRequest(forceSort, forcePage, forceLimit).then(
      (payments) => {
        deferred.resolve(
          payments.map(
            (payment) => {
              payment['confirmed'] = payment.blockId != '0';
              payment['outgoing'] = this.user.account == payment.sender;
              payment['messageText'] = this.parseMessage(payment);
              payment['account'] = this.user.account == payment.sender ? payment.recipient : payment.sender;
              payment['decimals'] = 8;
              if (payment.timestamp == 0) {
                payment['messageText'] = 'Welcome to HEAT, Stakeholder! This is your HEAT initial stake.'
              }
              if (payment.currency != "0") {
                payment['symbol'] = payment.currency;
                this.assetInfo.getInfo(payment.currency).then((info) => {
                  this.$scope.$evalAsync(() => {
                    payment['symbol'] = info.symbol;
                    payment['decimals'] = info.decimals;
                  });
                })
              }
              else {
                payment['symbol'] = 'HEAT';
              }
              return payment;
            }
          )
        );
      },
      deferred.reject
    );
    return deferred.promise;
  }

  createGetPaymentsRequest(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<IHeatPayment>> {
    var sortColumn = forceSort || this.query.order;
    var page = forcePage || this.query.page;
    var limit = forceLimit || this.query.limit;

    var from = (page-1) * limit;
    var to = from + limit - 1;
    var sortAsc = true;

    /* Must remove the - sign at start of order column */
    if (/-\w+/.test(sortColumn)) {
      sortAsc = false;
      sortColumn = sortColumn.substring(1);
    }
    return this.heat.api.getPayments(this.user.account, 'all', sortColumn, sortAsc, from, to);
  }

  parseMessage(payment: IHeatPayment) {
    return this.heat.getHeatMessageContents(payment);
  }
}
