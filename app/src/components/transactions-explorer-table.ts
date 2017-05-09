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
  selector: 'transactionsExplorerTable',
  styles: [`
    transactions-explorer-table .confirmed-th {
      text-align: center;
      width: 32px;
    }
    transactions-explorer-table .confirmed-td * {
      font-size: 16px;
    }
    transactions-explorer-table .outgoing {
      color: #f44336 !important;
      font-size: 16px;
    }
    transactions-explorer-table .incoming {
      color: #8BC34A !important;
      font-size: 16px;
    }
    transactions-explorer-table .stretch {
      width: 99%;
    }
    transactions-explorer-table td {
      vertical-align: top !important;
      padding-top: 18px !important;
    }
    transactions-explorer-table .message-text {
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
      <th md-column>
        <span>Sender</span>
      </th>
      <th md-column>
        <span>Recipient</span>
      </th>
      <th md-column md-numeric>
        <span>Amount</span>
      </th>
      <th md-column md-numeric>
        <span>Fee</span>
      </th>
      <th md-column>
        <span>Type</span>
      </th>

    `,`
      <td md-cell class="confirmed-td">
        <elipses-loading ng-if="!item.confirmed"></elipses-loading>
        <md-icon ng-if="item.confirmed" md-font-library="material-icons">check</md-icon>
      </td>
      <td md-cell nowrap>
        <timestamp timestamp-value="item.timestamp"></timestamp>
      </td>
      <td md-cell nowrap>
        <span>{{item.sender}}</span>
      </td>
      <td md-cell nowrap>
        <span>{{item.recipient}}</span>
      </td>
      <td md-cell md-numeric nowrap>
        <money precision="8" amount="item.amountNQT" symbol="'HEAT'" fraction="2"></money>
      </td>
      <td md-cell md-numeric nowrap>
        <money precision="8" amount="item.feeNQT" symbol="'HEAT'" fraction="2"></money>
      </td>
      <td md-cell>
        <span>{{item.transactionType}}</span>
      </td>
    `
  )
})
@Inject('$scope','$q','$timeout','user','heat','$interval')
class TransactionsExplorerTableComponent extends AbstractDataTableComponent {

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private user: UserService,
              private heat: HeatService,
              private $interval: angular.IIntervalService) {
    super($scope, $q, $timeout, "-timestamp");
    this.query =  {
      order: '-timestamp',
      limit: 10,
      page: 1
    };

    //var topic = new TransactionTopicBuilder();
    // var observer = engine.socket().observe<TransactionObserver>(topic).
    //   add(this.refresh).
    //   remove(this.refresh).
    //   confirm(this.refresh);

    //$scope.$on("$destroy",() => { observer.destroy() });
    this.refresh();
  }

  getCount() : angular.IPromise<number> {
    var deferred = this.$q.defer();
    /*
    this.engine.socket().api.getBlockchainStatus().then((status) => {
      deferred.resolve(40000);
    },deferred.reject);
    */
    return deferred.promise;
  }

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<any>> {
    var deferred = this.$q.defer();
    /*
    var request = this.createGetBlockchainTransactionsRequest(forceSort, forcePage, forceLimit);
    this.engine.socket().api.getBlockchainTransactions("", request).then(
      (transactions) => {
        deferred.resolve(
          transactions.map((transaction) => {
            transaction['confirmed'] = angular.isDefined(transaction.confirmations) ? true : false;
            transaction['transactionType'] = this.getTransactionType(transaction);
            return transaction;
          })
        );
      },
      deferred.reject
    );
    */
    return deferred.promise;
  }

  /*
  createGetBlockchainTransactionsRequest(forceSort?: string, forcePage?: number, forceLimit?: number): any {
    var page = forcePage || this.query.page;
    var limit = forceLimit || this.query.limit;

    var from = (page-1) * limit;
    var to = from + limit;

    return {
      firstIndex: from,
      lastIndex: to
    }
  }
  */

  /*
  getTransactionType(transaction: ITransaction) {
    if (transaction.type == 0 && transaction.subtype == 0)
      return "payment";
    if (transaction.type == 1 && transaction.subtype == 0)
      return "message";
    return "other";
  }
  */
}