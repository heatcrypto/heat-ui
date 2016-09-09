/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
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
interface IAbstractDataTableQuery {
  order: string;
  limit: number;
  page: number;
}

interface IAbstractDataTableData {
  count: number;
  items: Array<any>;
}

abstract class AbstractDataTableComponent {

  /* Bound to md-data-table, will update from clicking columns and interacting
     with the pagination control */
  public query : IAbstractDataTableQuery = {
    order: '-timestamp',
    limit: 10,
    page: 1
  };

  /* Data object that holds the rows and exposes the total count */
  public data : IAbstractDataTableData = {
    count: 0,
    items: []
  };

  /* When fetching data assign your active promises to this property so the
     data table can display a loading animation */
  private promise = null;

  /* Bound to the data table through ng-model, will at all times hold the
     selected model objects for each selected row, this must be cleared when
     moving to another page */
  public selected = [];

  private onReorderBind: any;
  private onPaginateBind: any;
  public refresh: Function;

  /**
   * The defaultSortColumn argument contains the name of the default sort column
   * with an optional '-' character pre-pended to indicate a descending sort order.
   */
  constructor(protected $scope : angular.IScope,
              protected $q: angular.IQService,
              protected $timeout: angular.ITimeoutService,
              protected defaultSortColumn: string) {
    this.query.order = defaultSortColumn;
    this.onReorderBind = angular.bind(this, this.onReorder);
    this.onPaginateBind = angular.bind(this, this.onPaginate);
    this.refresh = () => {
      this.promise = [
        this.getCount().then((count) => {
          this.$scope.$evalAsync(() => {
            this.data.count = count;
            this.query.page = 1;
            this.query.order = this.defaultSortColumn;
          })
        }),
        this.getPage()
      ];
    }
  }

  abstract getCount(): angular.IPromise<number>;

  abstract getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<any>>;

  private getPage(forceSort?: string, forcePage?: number, forceLimit?: number) : angular.IPromise<any> {
    return this.getPageItems(forceSort, forcePage, forceLimit).then(
      (items) => { this.$scope.$evalAsync(() => { this.data.items = items; }) },
      (error) => { this.$scope.$evalAsync(() => { this.data.items = []; }) }
    );
  }

  onReorder(order) {
    this.$timeout(() => { this.promise = this.getPage(order) }, 200);
  }

  onPaginate(page, limit) {
    this.promise = this.getPage(this.query.order, page, limit);
  }

  static template(headTemplate: string, bodyTemplate: string) : string {
    return `
      <div layout="column" flex layout-fill>
        <md-table-container flex>
          <table md-table md-progress="vm.promise" ng-model="vm.selected">
            <thead md-head md-order="vm.query.order" md-on-reorder="vm.onReorderBind">
              <tr md-row>${headTemplate}</tr>
            </thead>
            <tbody md-body>
              <tr md-row md-auto-select="true" ng-repeat="item in vm.data.items">${bodyTemplate}</tr>
            </tbody>
          </table>
        </md-table-container>
        <md-table-pagination md-limit="vm.query.limit" md-page="vm.query.page"
          md-total="{{vm.data.count}}" md-on-paginate="vm.onPaginateBind"
          md-page-select></md-table-pagination>
      </div>
    `
  }
}