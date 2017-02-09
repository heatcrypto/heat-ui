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
  selector: 'geoChart',
  styles: [``],
  template: AbstractGeoChartComponent.template(
    `GEO CHART`,
    `<div id="demo-aggr">
        <div class="aggregation-toggle">
            <input type="checkbox" checked="checked" id="enableAggr" value="1" /><label for="enableAggr">Enable aggregation</label>
        </div>

    </div>

    <div id="demo"></div>`
  )
})
@Inject('$scope', '$q', '$timeout', 'user', 'heat', 'HTTPNotify', 'assetInfo')
class GeoChartComponent extends AbstractGeoChartComponent {

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private user: UserService,
              private heat: HeatService,
              private HTTPNotify: HTTPNotifyService,
              private assetInfo: AssetInfoService) {
    super($scope, $q, $timeout);

    this.HTTPNotify.on(() => {
      this.refresh();
    }, $scope);

    this.refresh();
  }

  getCount(): angular.IPromise<number> {
    return this.heat.api.getPaymentsCount(this.user.account, 'all');
  }

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<IHeatPayment>> {
    var deferred = this.$q.defer();
    this.createGetChartsDataRequest('8709927280637656798', '0', "DAY").then(
      (chartData) => {
        deferred.resolve(chartData);
      },
      deferred.reject
    );
    return deferred.promise;
  }

  createGetChartsDataRequest(currency: string, asset: string, window: string): angular.IPromise<IHeatChart> {
    return this.heat.api.getOHLCChartData(currency, asset, window);
  }

}
