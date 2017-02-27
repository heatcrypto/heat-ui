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
declare var techan: any, d3: any;
@Component({
  selector: 'traderChart',
  inputs: ['currencyInfo','assetInfo'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" layout-align="end" class="intervals">
        <div ng-class="{'selected':vm.interval=='ONE_MINUTE'}" ng-click="vm.setInterval('ONE_MINUTE')">1 Minute</div>
        <div ng-class="{'selected':vm.interval=='FIVE_MINUTES'}" ng-click="vm.setInterval('FIVE_MINUTES')">5 Minutes</div>
        <div ng-class="{'selected':vm.interval=='TEN_MINUTES'}" ng-click="vm.setInterval('TEN_MINUTES')">10 Minutes</div>
        <div ng-class="{'selected':vm.interval=='HOUR'}" ng-click="vm.setInterval('HOUR')">1 Hour</div>
        <div ng-class="{'selected':vm.interval=='DAY'}" ng-click="vm.setInterval('DAY')">1 Day</div>
        <div ng-class="{'selected':vm.interval=='WEEK'}" ng-click="vm.setInterval('WEEK')">1 Week</div>
      </div>
      <div layout="column" flex layout-fill>
        <div id="ohlcchart" flex ng-if="vm.currencyInfo&&vm.assetInfo"></div>
      </div>
    </div>
  `,
  link: function (scope, element, attrs, controller: TraderChartComponent) {
    function loop() {
      if (!controller.determineElementSize()) {
        setTimeout(loop, 50);
      }
    }
    setTimeout(loop, 50);
  }
})
@Inject('$scope','heat','$q','$window')
class TraderChartComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  interval: string = "DAY"; // "ONE_MINUTE", "FIVE_MINUTES", "TEN_MINUTES", "HOUR", "DAY", "WEEK"

  // we need these in order to know how big our svg should be
  fullWidth: number;
  fullHeight: number;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private $q: angular.IQService,
              private $window: angular.IWindowService)
  {
    let onresize = utils.debounce(()=>{ this.determineElementSize() },50);
    angular.element($window).on('resize', onresize);
    $scope.$on('$destroy',()=>{ angular.element($window).off('resize', onresize) });
  }

  private determineElementSize(): boolean {
    let ohlcchart = <HTMLElement>document.querySelector('#ohlcchart');
    if (ohlcchart && ohlcchart.offsetWidth > 0 && ohlcchart.offsetHeight > 0) {
      this.fullWidth = ohlcchart.clientWidth;
      this.fullHeight = ohlcchart.clientHeight;
      this.refresh();
      return true;
    }
    return false;
  }

  private getOHLCChartData(): angular.IPromise<IHeatChart> {
    return this.heat.api.getOHLCChartData(this.currencyInfo.id, this.assetInfo.id, this.interval);
  }

  public setInterval(interval) {
    this.interval = interval;
    this.refresh();
  }

  public refresh() {
    this.getOHLCChartData().then((heatChart: IHeatChart) => {
      let margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = this.fullWidth - margin.left - margin.right,
        height = this.fullHeight - margin.top - margin.bottom;

      let x = techan.scale.financetime()
        .range([0, width]);

      let y = d3.scaleLinear()
        .range([height, 0]);

      var close = techan.plot.close()
          .xScale(x)
          .yScale(y);

      let xAxis = d3.axisBottom()
        .scale(x)
        .ticks(6)

      let yAxis = d3.axisLeft()
        .scale(y)
        .ticks(6)

      d3.selectAll('svg').remove();

      let svg = d3.select("#ohlcchart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let parseDate = d3.timeParse("%d-%b-%y");
      let accessor = close.accessor();
      let data = [];
      heatChart.data.forEach(function (d) {
        /**
         *
         [0] timestamp, // number timestamp in HEAT epoch format
          [1] avg, // string or number if < 9007199254740991
          [2] low, // string or number if < 9007199254740991
          [3] high, // string or number if < 9007199254740991
          [4] vol, // string or number if < 9007199254740991
          [5] open, // string or number if < 9007199254740991
          [6] close // string or number if < 9007199254740991
          */
        data.push({
          date: parseDate(convertToDate(d[0])),
          open: +d[5],
          high: +d[3],
          low: +d[2],
          close: +d[6],
          volume: +d[4]
        });
      });

      data.sort(function (a, b) {
        return d3.ascending(accessor.d(a), accessor.d(b));
      });

      svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

      svg.append("g")
              .attr("class", "y axis")

      x.domain(data.map(close.accessor().d));
      y.domain(techan.scale.plot.ohlc(data, close.accessor()).domain());

      var defs = svg.append("defs");

      // Create the "volume" graph.
      var volumeArea = d3.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.volume / 1000000000); })
        .curve(d3.curveBasis)

      var volumeGradient = defs.append("linearGradient")
        .attr("id", "svgVolumeGradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "40%");

      volumeGradient.append("stop")
        .attr('class', 'start')
        .attr("offset", "0%")
        .attr("stop-color", "#223141")
        .attr("stop-opacity", 0.1);

      volumeGradient.append("stop")
        .attr('class', 'end')
        .attr("offset", "100%")
        .attr("stop-color", "#4e5fd3")
        .attr("stop-opacity", 0.2);

      svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("fill","url(#svgVolumeGradient)")
        .attr("d", volumeArea);

      let volumeLine = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.volume / 1000000000); })
      .curve(d3.curveBasis)

      svg.append("path")
        .datum(data)
        .attr("class", "volume")
        .attr("fill","none")
        .attr("stroke", "#4e5fd3")
        .attr("stroke-width", "1px")
        .attr("d", volumeLine)

      // Create the "close" graph.
      var closeArea = d3.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.close); })
        .curve(d3.curveBasis)

      var closeGradient = defs.append("linearGradient")
        .attr("id", "svgCloseGradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "40%");

      closeGradient.append("stop")
        .attr('class', 'start')
        .attr("offset", "0%")
        .attr("stop-color", "#223141")
        .attr("stop-opacity", 0.1);

      closeGradient.append("stop")
        .attr('class', 'end')
        .attr("offset", "100%")
        .attr("stop-color", "#ea543d")
        .attr("stop-opacity", 0.2);

      svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("fill","url(#svgCloseGradient)")
        .attr("d", closeArea);

      let closeLine = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.close); })
      .curve(d3.curveBasis)

      svg.append("path")
        .datum(data)
        .attr("class", "close")
        .attr("fill","none")
        .attr("stroke", "#ea543d")
        .attr("stroke-width", "1px")
        .attr("d", closeLine)

      svg.selectAll("g.x.axis").call(xAxis);
      svg.selectAll("g.y.axis").call(yAxis);

      function convertToDate(date) {
        let format = 'dd-mmm-yy';
        let dateFormated = utils.timestampToDate(parseInt(date));
        return dateFormat(dateFormated, format);
      }
    });
  }
}