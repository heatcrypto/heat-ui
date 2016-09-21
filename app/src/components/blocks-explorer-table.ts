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
  selector: 'blocksExplorerTable',
  styles: [`
    blocks-explorer-table .confirmed-th {
      text-align: center;
      width: 32px;
    }
    blocks-explorer-table .confirmed-td * {
      font-size: 16px;
    }
    blocks-explorer-table .outgoing {
      color: #f44336 !important;
      font-size: 16px;
    }
    blocks-explorer-table .incoming {
      color: #8BC34A !important;
      font-size: 16px;
    }
    blocks-explorer-table .stretch {
      width: 99%;
    }
    blocks-explorer-table td {
      vertical-align: top !important;
      padding-top: 18px !important;
    }
    blocks-explorer-table .message-text {
      margin-bottom: 18px;
    }
  `],
  template: AbstractDataTableComponent.template(`
      <th md-column md-numeric>
        <span>Height</span>
      </th>
      <th md-column>
        <span>Block</span>
      </th>
      <th md-column>
        <span>Date</span>
      </th>
      <th md-column>
        <span>Generator</span>
      </th>
      <th md-column md-numeric>
        <span>Transactions</span>
      </th>
      <th md-column md-numeric>
        <span>Amount</span>
      </th>
      <th md-column md-numeric>
        <span>Fee</span>
      </th>
    `,`
      <td md-cell md-numeric nowrap>
        <span>{{item.height}}</span>
      </td>
      <td md-cell nowrap>
        <span>{{item.block}}</span>
      </td>
      <td md-cell nowrap>
        <timestamp timestamp-value="item.timestamp"></timestamp>
      </td>
      <td md-cell nowrap>
        <span>{{item.generator}}</span>
      </td>
      <td md-cell md-numeric nowrap>
        <span>{{item.numberOfTransactions}}</span>
      </td>
      <td md-cell md-numeric nowrap>
        <money precision="8" amount="item.totalAmountNQT" symbol="'HEAT'" fraction="2"></money>
      </td>
      <td md-cell md-numeric nowrap>
        <money precision="8" amount="item.totalFeeNQT" symbol="'HEAT'" fraction="2"></money>
      </td>
    `
  )
})
@Inject('$scope','$q','$timeout','user','engine','$interval')
class BlockExplorerTableComponent extends AbstractDataTableComponent {

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private user: UserService,
              private engine: EngineService,
              private $interval: angular.IIntervalService) {
    super($scope, $q, $timeout, "-timestamp");
    this.query =  {
      order: '-timestamp',
      limit: 10,
      page: 1
    };
    this.refresh();

    // quick and dirty solution
    var interval = $interval(() => { this.refresh() }, 15*1000, 0, false);
    $scope.$on('$destroy', () => { $interval.cancel(interval) });
  }

  getCount() : angular.IPromise<number> {
    var deferred = this.$q.defer();
    this.engine.socket().api.getBlockchainStatus().then((status) => {
      deferred.resolve(status.numberOfBlocks);
    },deferred.reject);
    return deferred.promise;
  }

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<any>> {
    var deferred = this.$q.defer();
    var request = this.createGetBlocksRequest(forceSort, forcePage, forceLimit);
    this.engine.socket().api.getBlocks(request).then(
      (blocks) => {
        deferred.resolve(
          blocks.map((block) => {
            return block;
          })
        );
      },
      deferred.reject
    );
    return deferred.promise;
  }

  createGetBlocksRequest(forceSort?: string, forcePage?: number, forceLimit?: number): IGetBlocksRequest {
    var page = forcePage || this.query.page;
    var limit = forceLimit || this.query.limit;

    var from = (page-1) * limit;
    var to = from + limit;

    return {
      firstIndex: from,
      lastIndex: to
    }
  }
}