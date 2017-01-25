///<reference path='AbstractChartComponent.ts'/>
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
    selector: 'ohlcChart',
    styles: [`
    path.candle {
        stroke: #000000;
    }
    path.candle.body {
        stroke-width: 0;
    }
    path.candle.up {
        fill: #00AA00;
        stroke: #00AA00;
    }
    path.candle.down {
        fill: #FF0000;
        stroke: #FF0000;
    }
    `],
    template: AbstractChartComponent.template(`
        Candlestick Chart
    `, `
      <div>
        <md-select ng-model="vm.windowIntervalData" ng-change="vm.changeWindowInterval()">
          <md-option ng-repeat="key in vm.windowIntervalKeys" value="{{key}}">{{key}}</md-option>
        </md-select>
      </div>
      <div id="ohlcchart"></div>
    `
    )
})
@Inject('$scope', '$q', '$timeout', 'user', 'heat', 'HTTPNotify', 'assetInfo')
class OHLCCartComponent extends AbstractChartComponent {

    windowIntervalKeys: Array<string> = [];
    windowIntervalData: string = "ONE_MINUTE";

    constructor($scope: angular.IScope,
                $q: angular.IQService,
                $timeout: angular.ITimeoutService,
                private user: UserService,
                private heat: HeatService,
                private HTTPNotify: HTTPNotifyService,
                private assetInfo: AssetInfoService) {
        super($scope, $q, $timeout);

        this.HTTPNotify.on(() => {
            this.refresh()
        }, $scope);

        this.refresh();
        this.windowIntervalKeys = ["ONE_MINUTE", "FIVE_MINUTES", "TEN_MINUTES", "HOUR", "DAY", "WEEK"];
    }

    getPageItems(): angular.IPromise<Array<IHeatChart>> {
        var deferred = this.$q.defer();
        this.createGetChartsDataRequest('8709927280637656798', '0', this.windowIntervalData).then(
            (chartData) => {
                deferred.resolve(chartData);
            },
            deferred.reject
        );
        return deferred.promise;
    }

    createGetChartsDataRequest(currency: string, asset: string, window: string): angular.IPromise<Array<IHeatChart>> {
        return this.heat.api.getOHLCChartData(currency, asset, window);
    }

    changeWindowInterval(){
      this.getPageItems();
      this.refresh();
    }

}
