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
        <div ng-class="{'selected':vm.filter=='ALL'}" ng-click="vm.setFilter('ALL')">All</div>
        <div ng-class="{'selected':vm.filter=='ONE_MONTH'}" ng-click="vm.setFilter('ONE_MONTH')">1 Month</div>
        <div ng-class="{'selected':vm.filter=='ONE_WEEK'}" ng-click="vm.setFilter('ONE_WEEK')">1 Week</div>
        <div ng-class="{'selected':vm.filter=='ONE_DAY'}" ng-click="vm.setFilter('ONE_DAY')">1 Day</div>
        <div ng-class="{'selected':vm.filter=='ONE_HOUR'}" ng-click="vm.setFilter('ONE_HOUR')">1 Hour</div>
        <div ng-class="{'selected':vm.filter=='FIVE_MINUTES'}" ng-click="vm.setFilter('FIVE_MINUTES')">5 Minutes</div>
        <div ng-class="{'selected':vm.filter=='ONE_MINUTE'}" ng-click="vm.setFilter('ONE_MINUTE')">1 Minutes</div>
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

  interval: string = "HOUR"; // "ONE_MINUTE", "FIVE_MINUTES", "TEN_MINUTES", "HOUR", "DAY", "WEEK"
  filter: string = 'ALL'; // 'ONE_MONTH', 'ONE_WEEK', 'ONE_DAY', 'ONE_HOUR', 'FIVE_MINUTES', 'ONE_MINUTE'

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

  public setFilter(filter) {
    this.filter = filter;
    this.refresh();
  }

  public refresh() {
    this.getOHLCChartData().then((heatChart: IHeatChart) => {
      let margin = {top: 20, right: 20, bottom: 60, left: 50},
        width = this.fullWidth - margin.left - margin.right,
        height = this.fullHeight - margin.top - margin.bottom;

      let x = techan.scale.financetime()
        .range([0, width]);

      let y = d3.scaleLinear()
        .range([height, 0]);

      var close = techan.plot.close()
          .xScale(x)
          .yScale(y);

      let tickFormat
      if (this.filter === 'ONE_DAY' ||
          this.filter === 'ONE_HOUR' ||
          this.filter === 'FIVE_MINUTES' ||
          this.filter === 'ONE_MINUTE') {
            this.interval = 'ONE_MINUTE'
            tickFormat = '%H:%M:%S'
      } else {
            this.interval = 'HOUR'
            tickFormat = "%Y-%m-%d"
      }

      let ticks
      switch (this.filter) {
        case 'ONE_MONTH':
          ticks = 20
          break;
        case 'ONE_WEEK':
          ticks = 6
          break;
        case 'ONE_DAY':
          ticks = 24
          break;
        case 'ONE_HOUR':
          ticks = 20
          break;
        case 'FIVE_MINUTES':
          ticks = 5
          break;
        case 'ONE_MINUTE':
          ticks = 20
          break;
        default:
          ticks = 30
          break;
      }

      let xAxis = d3.axisBottom()
        .scale(x)
        .ticks(ticks)
        .tickSize(-height)
        .tickFormat(d3.timeFormat(tickFormat))

      let yAxis = d3.axisLeft()
        .scale(y)
        .tickSize(-width)
        .ticks(6)

      d3.selectAll('svg').remove();

      let svg = d3.select("#ohlcchart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let parseDate = d3.timeParse("%d-%b-%y %H:%M:%S");
      let accessor = close.accessor();
      let data = [];
      heatChart.data.forEach((d) => {
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

        let itemDate = utils.timestampToDate(parseInt(d[0]));
        let filterDate = getFilterDateTime(this.filter)
        if (itemDate >= filterDate) {
          data.push({
            date: parseDate(convertToDate(d[0])),
            open: +d[5],
            high: +d[3],
            low: +d[2],
            close: +d[6],
            volume: +d[4]
          });
        }
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

      svg.selectAll("g.x.axis").call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-2em")
        .attr("dy", "-0.05em")
        .attr("transform", "rotate(-90)");

      svg.selectAll("g.x.axis")
        .selectAll("line")
        .style("stroke-opacity", "0.4")
        .style('stroke-width', '0.5px')

      svg.selectAll("g.y.axis").call(yAxis)

      svg.selectAll("g.y.axis")
        .selectAll("line")
        .style("stroke-opacity", "0.4")
        .style('stroke-width', '0.5px')

      function getFilterDateTime(filter) {
        let filterDate = new Date()
        switch (filter) {
          case 'ONE_MONTH':
            filterDate.setMonth(filterDate.getMonth() - 1)
            break;
          case 'ONE_WEEK':
            filterDate.setDate(filterDate.getDate() - 7)
            break;
          case 'ONE_DAY':
            filterDate.setDate(filterDate.getDate() - 1)
            break;
          case 'ONE_HOUR':
            filterDate.setHours(filterDate.getHours() - 1)
            break;
          case 'FIVE_MINUTES':
            filterDate.setMinutes(filterDate.getMinutes() - 5)
            break;
          case 'ONE_MINUTE':
            filterDate.setMinutes(filterDate.getMinutes() - 1)
            break;
          default:
            filterDate.setFullYear(filterDate.getFullYear() - 100)
            break;
        }
        return filterDate
      }

      function convertToDate(date) {
        let format = 'dd-mmm-yy HH:mm:ss';
        let dateFormated = utils.timestampToDate(parseInt(date));
        return dateFormat(dateFormated, format);
      }
    });
  }
}
