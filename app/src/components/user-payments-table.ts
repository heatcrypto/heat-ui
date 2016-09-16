///<reference path='AbstractDataTableComponent.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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
    user-payments-table td {
      vertical-align: top !important;
      padding-top: 18px !important;
    }
    user-payments-table .message-text {
      margin-bottom: 18px;
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
      <th md-column md-numeric>
        <span>Amount</span>
      </th>
      <th md-column></th>
      <th md-column md-order-by="sender_id">
        <span>Sender</span>
      </th>
      <th md-column md-order-by="recipient_id">
        <span>Recipient</span>
      </th>
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
        <money precision="8" amount="item.amount" symbol="vm.user.accountColorName"
          outgoing="item.outgoing" fraction="2"></money>
      </td>
      <td md-cell>
        <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing}">
          {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
        </md-icon>
      </td>
      <td md-cell nowrap>
        <span>{{item.sender}}</span>
      </td>
      <td md-cell nowrap>
        <span>{{item.recipient}}</span>
      </td>
      <td md-cell class="stretch">
        <div class="message-text">{{item.messageText}}</div>
      </td>
    `
  )
})
@Inject('$scope','$q','$timeout','user','cloud','engine')
class UserPaymentsTableComponent extends AbstractDataTableComponent {

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private user: UserService,
              private cloud: CloudService,
              private engine: EngineService) {
    super($scope, $q, $timeout, "-timestamp");

    var topic = new TransactionTopicBuilder().account(this.user.account);
    var observer = engine.socket().observe<TransactionObserver>(topic).
      add(this.refresh).
      remove(this.refresh).
      confirm(this.refresh);

    $scope.$on("$destroy",() => { observer.destroy() });

    this.refresh();
  }

  getCount() : angular.IPromise<number> {
    return this.cloud.api.getPaymentCount({ accountRS: this.user.accountRS });
  }

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<any>> {
    var deferred = this.$q.defer();
    var request = this.createGetPaymentsRequest(forceSort, forcePage, forceLimit);
    this.cloud.api.getPayments(request).then(
      (payments) => {
        deferred.resolve(
          payments.map(
            (payment) => {
              payment['outgoing'] = this.user.accountRS == payment.senderRS;
              payment['messageText'] = this.parseMessage(payment);
              return payment;
            }
          )
        );
      },
      deferred.reject
    );
    return deferred.promise;
  }

  createGetPaymentsRequest(forceSort?: string, forcePage?: number, forceLimit?: number): ICloudGetPaymentsRequest {
    var sortColumn = forceSort || this.query.order;
    var page = forcePage || this.query.page;
    var limit = forceLimit || this.query.limit;

    var from = (page-1) * limit;
    var to = from + limit;
    var sortAsc = true;

    /* Must remove the - sign at start of order column */
    if (/-\w+/.test(sortColumn)) {
      sortAsc = false;
      sortColumn = sortColumn.substring(1);
    }
    return {
      accountRS: this.user.accountRS,
      firstIndex: from,
      lastIndex: to,
      sortColumn: sortColumn,
      sortAsc: sortAsc
    }
  }

  parseMessage(payment: ICloudPayment) {
    if (payment.message) {
      var message = payment.message;
      if (message.recipientRS == this.user.accountRS) {
        return heat.crypto.decryptMessage(message.data, message.nonce, message.senderPublicKey, this.user.secretPhrase);
      }
      else if (message.senderRS == this.user.accountRS) {
        return heat.crypto.decryptMessage(message.data, message.nonce, message.recipientPublicKey, this.user.secretPhrase);
      }
      return "[Encrypted]";
    }
    return "";
  }
}