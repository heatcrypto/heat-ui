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
@Inject('$scope','heat','$q', '$interval', '$window')
class TraderChartComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  interval: string = "HOUR"; // "ONE_MINUTE", "FIVE_MINUTES", "TEN_MINUTES", "HOUR", "DAY", "WEEK"
  filter: string = 'ALL'; // 'ONE_MONTH', 'ONE_WEEK', 'ONE_DAY', 'ONE_HOUR', 'FIVE_MINUTES', 'ONE_MINUTE'
  chart: {
    closeLine: any,
    close: any,
    closeArea: any,
    volumeLine: any,
    volumeArea: any,
    data: any,
    x: any,
    xAxis: any
  } = {closeLine: null, close: null, closeArea: null, volumeLine: null, volumeArea: null, data: null, x: null, xAxis: null};

  // we need these in order to know how big our svg should be
  fullWidth: number;
  fullHeight: number;

  lastTrade: any;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private $q: angular.IQService,
              private $interval: angular.IIntervalService,
              private $window: angular.IWindowService)
  {
    // have to wrap in function since currencyInfo and assetInfo are set after construction
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        // we need to only 1 time register the websocket listener
        this.subscribeToOrderEvents(this.currencyInfo.id, this.assetInfo.id);
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];

    let onresize = utils.debounce(()=>{ this.determineElementSize() },50);
    angular.element($window).on('resize', onresize);
    let interval = $interval(()=> { this.checkForFlatline() }, 2000);
    $scope.$on('$destroy',()=>{
      angular.element($window).off('resize', onresize);
      $interval.cancel(interval);
    });
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
    if (this.filter === 'ONE_DAY' ||
        this.filter === 'ONE_HOUR' ||
        this.filter === 'FIVE_MINUTES' ||
        this.filter === 'ONE_MINUTE') {
          this.interval = 'ONE_MINUTE'
    } else {
          this.interval = 'HOUR'
    }
    return this.heat.api.getOHLCChartData(this.currencyInfo.id, this.assetInfo.id, this.interval);
  }

  private subscribeToOrderEvents(currency: string, asset: string) {
    this.heat.subscriber.order({currency: currency, asset: asset}, (order: IHeatOrder) => {
      if (order.unconfirmed === false) {
        let price = parseInt(order.price)
        let OHLCChartItemData = {
          close: price,
          date: new Date(),
          high: price,
          low: price,
          open: price,
          volume: parseInt(order.quantity)
        }
        this.update(OHLCChartItemData)
      }
    }, this.$scope);
  }

  private checkForFlatline() {
    if (this.chart.data && this.chart.data.length > 0) {
      let lastDate = this.chart.data[this.chart.data.length - 1].date.getTime()
      let now = new Date().getTime()
      let diff = (now - lastDate) / 1000
      if (diff > 2) {
        let lastPrice = this.chart.data[this.chart.data.length - 1].close
        let OHLCChartItemData = {
          close: lastPrice,
          date: new Date(),
          high: lastPrice,
          low: lastPrice,
          open: lastPrice,
          volume: 0
        }
        this.update(OHLCChartItemData)
      }
    }
  }

  public setInterval(interval) {
    this.interval = interval;
    this.refresh();
  }

  public setFilter(filter) {
    this.filter = filter;
    this.refresh();
  }

  public update(OHLCChartItemData: any) {
    this.lastTrade = OHLCChartItemData
    this.chart.data.push(OHLCChartItemData)
    d3.select(".close-line")
      .attr("d", this.chart.closeLine)
      .attr("transform", null)
      .transition()

    d3.select(".close-area")
      .attr("d", this.chart.closeArea)
      .attr("transform", null)
      .transition()

    d3.select(".volume-line")
      .attr("d", this.chart.volumeLine)
      .attr("transform", null)
      .transition()

    d3.select(".volume-area")
      .attr("d", this.chart.volumeArea)
      .attr("transform", null)
      .transition()

    let filterDate = this.getFilterDateTime(this.filter)
    let startDate = new Date(filterDate.valueOf())
    if (this.filter == 'ALL') {
      startDate = this.chart.data[0].date
    }
    this.chart.x.domain([startDate, new Date()]);

    d3.selectAll("g.x.axis").call(this.chart.xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "-0.05em")
      .attr("transform", "rotate(-90)");

    if (this.chart.data[0].date < filterDate) {
      this.chart.data.shift();
    }
  }

  public refresh() {
    this.getOHLCChartData().then((heatChart: IHeatChart) => {
      let margin = {top: 20, right: 80, bottom: 60, left: 50},
        width = this.fullWidth - margin.left - margin.right,
        height = this.fullHeight - margin.top - margin.bottom;

      let yClose = d3.scaleLinear()
        .range([height, 0]);
      let yVolume = d3.scaleLinear()
        .range([height, 0]);

      let tickFormat
      if (this.filter === 'ONE_DAY' ||
          this.filter === 'ONE_HOUR' ||
          this.filter === 'FIVE_MINUTES' ||
          this.filter === 'ONE_MINUTE') {
            tickFormat = '%H:%M:%S'
      } else {
            tickFormat = "%Y-%m-%d"
      }

      this.chart.x = d3.scaleTime()
        .range([0, width])

      var volume = techan.plot.volume()
          .accessor(techan.accessor.ohlc())
          .xScale(this.chart.x)
          .yScale(yVolume);

      this.chart.close = techan.plot.close()
          .xScale(this.chart.x)
          .yScale(yClose);

      this.chart.xAxis = d3.axisBottom()
        .scale(this.chart.x)
        .tickSize(-height)
        .tickFormat(d3.timeFormat(tickFormat))

      let yCloseAxis = d3.axisLeft()
        .scale(yClose)
        .ticks(6)

      let yVolumeAxis = d3.axisRight()
        .scale(yVolume)
        .tickFormat(d3.formatPrefix(",.0", 1e6))
        .ticks(6)

      d3.selectAll('svg').remove();

      let svg = d3.select("#ohlcchart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let parseDate = d3.timeParse("%d-%b-%y %H:%M:%S");
      let accessor = this.chart.close.accessor();
      let filterDate = this.getFilterDateTime(this.filter)
      this.chart.data = [];
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

        if (itemDate >= filterDate) {
          this.chart.data.push({
            date: parseDate(convertToDate(d[0])),
            open: +d[5],
            high: +d[3],
            low: +d[2],
            close: +d[6],
            volume: +d[4]
          });
        }
      });

      this.chart.data.sort(function (a, b) {
        return d3.ascending(accessor.d(a), accessor.d(b));
      });

      svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

      svg.append("g")
              .attr("class", "yClose axis")

      svg.append("g")
              .attr("class", "yVolume axis")

      let startDate = new Date(filterDate.valueOf())
      if (this.filter == 'ALL') {
        startDate = new Date(this.chart.data[0].date.valueOf())
      }

      yClose.domain(techan.scale.plot.ohlc(this.chart.data, this.chart.close.accessor()).domain());
      yVolume.domain(techan.scale.plot.volume(this.chart.data, this.chart.close.accessor().v).domain());

      let itemDate
      if (this.chart.data.length > 0) {
        this.lastTrade = this.chart.data[this.chart.data.length - 1]
        itemDate = new Date(this.chart.data[this.chart.data.length - 1].date.valueOf())
      } else {
        itemDate = new Date(startDate.valueOf())
      }
      if (this.filter === 'ONE_HOUR' ||
        this.filter === 'FIVE_MINUTES' ||
        this.filter === 'ONE_MINUTE') {
          let now = new Date()
          while (itemDate <= now) {
            this.chart.data.push({
              date: new Date(itemDate.valueOf()),
              open: this.lastTrade.close,
              high: this.lastTrade.close,
              low: this.lastTrade.close,
              close: this.lastTrade.close,
              volume: 0
            })
            let interval
            itemDate.setSeconds(itemDate.getSeconds() + 2);
          }
          yClose.domain([this.lastTrade.close - 5000, this.lastTrade.close + 5000]);
        }

      this.chart.x.domain([startDate, new Date()]);

      var defs = svg.append("defs");

      // Create the "volume" graph.
      this.chart.volumeArea = d3.area()
        .x((d) => { return this.chart.x(d.date); })
        .y0(height)
        .y1((d) => { return yVolume(d.volume); })
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
        .datum(this.chart.data)
        .attr("class", "volume-area")
        .attr("fill","url(#svgVolumeGradient)")
        .attr("d", this.chart.volumeArea);

      this.chart.volumeLine = d3.line()
      .x((d) => { return this.chart.x(d.date); })
      .y((d) => { return yVolume(d.volume); })
      .curve(d3.curveBasis)

      svg.append("path")
        .datum(this.chart.data)
        .attr("class", "volume-line")
        .attr("fill","none")
        .attr("stroke", "#4e5fd3")
        .attr("stroke-width", "1px")
        .attr("d", this.chart.volumeLine)

      // // Create the "close" graph.
      this.chart.closeArea = d3.area()
        .x((d) => { return this.chart.x(d.date); })
        .y0(height)
        .y1((d) => { return yClose(d.close); })
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
        .datum(this.chart.data)
        .attr("class", "close-area")
        .attr("fill","url(#svgCloseGradient)")
        .attr("d", this.chart.closeArea);

      this.chart.closeLine = d3.line()
        .x((d) => { return this.chart.x(d.date); })
        .y((d) => { return yClose(d.close); })
        .curve(d3.curveBasis)

      svg.append("path")
        .datum(this.chart.data)
        .attr("class", "close-line")
        .attr("fill","none")
        .attr("stroke", "#ea543d")
        .attr("stroke-width", "1px")
        .attr("d", this.chart.closeLine)

      svg.selectAll("g.x.axis").call(this.chart.xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "-0.05em")
        .attr("transform", "rotate(-90)");

      svg.selectAll("g.x.axis")
        .selectAll("line")
        .style("stroke-opacity", "0.4")
        .style('stroke-width', '0.5px')

      svg.selectAll("g.yClose.axis").call(yCloseAxis)

      svg.selectAll("g.yVolume.axis")
        .attr("transform", "translate( " + width + ", 0 )")
        .call(yVolumeAxis)

      function convertToDate(date) {
        let format = 'dd-mmm-yy HH:mm:ss';
        let dateFormated = utils.timestampToDate(parseInt(date));
        return dateFormat(dateFormated, format);
      }
    });
  }

  public getFilterDateTime(filter) {
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
}
