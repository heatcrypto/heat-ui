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
    `<div id="geo-chart"></div>`
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

  getPageItems(forceSort?: string, forcePage?: number, forceLimit?: number): angular.IPromise<Array<IHeatPayment>> {
    var deferred = this.$q.defer();
    this.createGetPeersDataRequest('3').then(
      (peersData) => {
        deferred.resolve(peersData);
      },
      deferred.reject
    );
    return deferred.promise;
  }

  createGetPeersDataRequest(state: string): angular.IPromise<Array<IHeatPeersInfo>> {
    return this.heat.api.getAllPeers(state);
  }

}
