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
interface IVirtualChartDataEntry {
  timestamp: number;
  date: Date;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  value: number;
}
enum TradingChartWindow {
  TEN_MINUTES=0,
  HOUR=1,
  DAY=2,
  WEEK=3
}

declare var d3: any;
declare var techan: any;
@Component({
  selector: 'traderChart',
  inputs: ['currency','asset'],
  styles: [`
    trader-chart { font: 10px sans-serif !important; }
    trader-chart .axis path, .axis line { fill: none; stroke: #999999; shape-rendering: crispEdges; }
    trader-chart .axis text { font-size: 8px; }
    trader-chart text.symbol { fill: #BBBBBB; }
    trader-chart path.candle { stroke: #000000; }
    trader-chart path.candle.body { stroke-width: 0; }
    trader-chart path.candle.up { fill: #00AA00; stroke: #00AA00; }
    trader-chart path.candle.down { fill: #FF0000; stroke: #FF0000; }
    trader-chart path.volume { fill: #DDDDDD; }
    trader-chart rect.pane { cursor: move; fill: none; pointer-events: all; }
    trader-chart .indicator path.line { fill: none; stroke-width: 2; }
    trader-chart .ma-0 path.line { stroke: #1f77b4; }
    trader-chart .ma-1 path.line { stroke: #aec7e8; }
    trader-chart .ma-2 path.line { stroke: #ff7f0e; }
    trader-chart .crosshair { cursor: crosshair; }
    trader-chart .crosshair path.wire { stroke: #DDDDDD; stroke-dasharray: 1, 1; }
    trader-chart .crosshair .axisannotation path { fill: #DDDDDD; }
  `],
  template: `
    <div flex layout="column" class="chart-container">
      price chart under development
    </div>
  `,
  link: function (scope, element, attrs, controller: TraderChartComponent) {
    var el: HTMLElement = element[0].children[0];
    /* runs a loop until the outer element is fully rendered */
    function loop() {
      if (el.parentElement.offsetWidth > 0 && el.parentElement.offsetHeight > 0) {
        // el.style.width = el.parentElement.clientWidth + 'px';
        // el.style.height = el.parentElement.clientHeight + 'px';
        controller.setElement(el);
      }
      else
        setTimeout(loop, 50);
    }
    setTimeout(loop, 50);
  },
})
@Inject('$scope','heat','$q','$window')
class TraderChartComponent {

  public currency: string; // @input
  public asset: string; // @input

  public window: TradingChartWindow;
  public loading: boolean = true;
  public chart: any;
  public element: HTMLElement;
  public title: string = "BTC/EUR";

  private onresize: (eventObject: JQueryEventObject) => any;
  private chartData: Array<IVirtualChartDataEntry>;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private $q: angular.IQService,
              private $window: angular.IWindowService)
  {
    /*

    disabled for now

    if (!angular.isDefined(this.window)) {
      this.window = TradingChartWindow.TEN_MINUTES;
    }
    this.onresize = () => { this.draw() };
    angular.element(this.$window).bind('resize', this.onresize);
    $scope.$on('$destroy',() => { angular.element(this.$window).unbind(this.onresize) });

    */
  }

  private setElement(el: HTMLElement) {
    this.element = el;
    //el.style.height = el.style.maxHeight = el.style.minHeight = (el.parentElement.parentElement.offsetHeight - 2) + 'px';
    //el.style.width = el.style.maxWidth = el.style.minWidth = (el.parentElement.parentElement.offsetWidth - 2) + 'px';
    this.getData().then((chartData) => {
      this.chartData = chartData;
      this.draw();
    })
  }

  private draw() {
    if (this.element && this.chartData) {
      this.createChart(this.element.offsetWidth, this.element.offsetHeight);
    }
  }

  private getServerData(currency: string, asset: string, window: TradingChartWindow): angular.IPromise<any> {
    var deferred = this.$q.defer();
    /*
    deferred.resolve({"data":[["27172397","250001","250001","250001","3000000","250001","250001"],["27211641","347778","300000","400000","9000000","300000","400000"],["28514148","433334","400001","450001","122222300","400001","450001"],["28875144","400000","400000","400000","100000000","400000","400000"],["28970683","300002","300002","300002","200000","300002","300002"],["33444168","528889","460000","600000","210000000","460000","600000"],["37629016","600000","600000","600000","1000","600000","600000"],["47213736","650000","600000","700000","1000000","600000","700000"],["47214012","300000","300000","300000","1","300000","300000"],["47379452","500000","300000","700000","1001","700000","300000"],["49931875","700000","700000","700000","1000","700000","700000"],["61103603","700000","700000","700000","100000","700000","700000"],["66934575","700000","700000","700000","600000","700000","700000"],["67024264","700000","700000","700000","5000000","700000","700000"],["67026991","750000","700000","800000","1500000","700000","800000"],["67365446","900000","800000","1000000","6397000","800000","1000000"],["67416610","1500000","1500000","1500000","100000","1500000","1500000"],["68348988","1400000","1400000","1400000","412302","1400000","1400000"],["75890561","1000000","1000000","1000000","100000","1000000","1000000"],["75961756","1025000","1000000","1050000","150000000","1000000","1050000"],["79758051","1450000","1450000","1450000","10000000","1450000","1450000"],["82412017","1075556","900000","1400000","39100000","1400000","900000"],["82440323","850000","850000","850000","87880000","850000","850000"],["82972919","580000","300000","800000","7500000","800000","300000"],["83051668","450000","450000","450000","2500000","450000","450000"],["83144301","450000","450000","450000","16561000","450000","450000"],["83213106","483333","450000","500000","30439000","450000","500000"],["84942728","540000","540000","540000","200000000","540000","540000"],["85013985","560000","560000","560000","30000000","560000","560000"],["85019989","510000","500000","515001","200000000","515001","500000"],["87036093","730000","600000","850000","23120000","600000","850000"],["87952262","1025000","900000","1100000","20000000","900000","1100000"],["90307993","1661538","1100000","2100000","108450000","1100000","2100000"]],"asset":{"decimals":8,"name":"BTC"}});
    */
    deferred.resolve({"data":[]});
    return deferred.promise;
  }

  public getData(): angular.IPromise<Array<IVirtualChartDataEntry>> {
    var deferred = this.$q.defer();
    this.getServerData(this.currency, this.asset, this.window).then((response) => {
      var decimals = response.decimals;
      var entries: Array<IVirtualChartDataEntry> = [];
      response.data.forEach((d) => {
        var timestamp = parseInt(String(d[0])), avg = d[1], low = d[2], high = d[3], vol = d[4], open = d[5], close = d[6];

        /*
          Legacy utils.calculateOrderPricePerWholeQNT SHOULD NOT! be used,
          use utils.calculateTotalOrderPriceQNT() instead
        */

        /*
        entries.push({
          timestamp: timestamp,
          date: utils.timestampToDate(timestamp),
          open: parseFloat(this.unformat(utils.calculateOrderPricePerWholeQNT(open, decimals))),
          close: parseFloat(this.unformat(utils.calculateOrderPricePerWholeQNT(close, decimals))),
          high: parseFloat(this.unformat(utils.calculateOrderPricePerWholeQNT(high, decimals))),
          low: parseFloat(this.unformat(utils.calculateOrderPricePerWholeQNT(low, decimals))),
          volume: parseFloat(this.unformat(utils.convertToQNTf(vol, decimals))),
          value: parseFloat(this.unformat(utils.calculateOrderPricePerWholeQNT(avg, decimals)))
        });
        */
        entries.sort(function (a, b) { return a.timestamp - b.timestamp });
        deferred.resolve(entries);
      });
    });
    return deferred.promise;
  }

  private unformat(number) {
    return String(number).replace(/,/g,'');
  }

  private createChart(fullWidth, fullHeight) {
    var margin = {top: 2, right: 2, bottom: 2, left: 2},
            width = fullWidth - margin.left - margin.right,
            height = fullHeight - margin.top - margin.bottom,
            volumeHeight = fullHeight*.45;

    var parseDate = d3.time.format("%d-%b-%y").parse;

    var zoom = d3.behavior.zoom()
            .on("zoom", draw);

    var x = techan.scale.financetime()
            .range([0, width]);

    var y = d3.scale.linear()
            .range([height, 0]);

    var yVolume = d3.scale.linear()
            .range([height, height - volumeHeight]);

    var candlestick = techan.plot.candlestick()
            .xScale(x)
            .yScale(y);

    var close = techan.plot.close()
            .xScale(x)
            .yScale(y);

    var sma0 = techan.plot.sma()
            .xScale(x)
            .yScale(y);

    var sma1 = techan.plot.sma()
            .xScale(x)
            .yScale(y);

    var ema2 = techan.plot.ema()
            .xScale(x)
            .yScale(y);

    var volume = techan.plot.volume()
            .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
            .xScale(x)
            .yScale(yVolume);

    var xAxis = d3.svg.axis()
            .scale(x)
            .ticks(8)
            .orient("top");

    var yAxis = d3.svg.axis()
            .scale(y)
            .ticks(4)
            .orient("left");

    var volumeAxis = d3.svg.axis()
            .scale(yVolume)
            .orient("right")
            .ticks(2)
            .tickFormat(d3.format(",.3s"));

    /* Crosshair start */

    var ohlcAnnotation = techan.plot.axisannotation()
            .axis(yAxis);
            // .format(d3.format(',.2fs'));

    var timeAnnotation = techan.plot.axisannotation()
            .axis(xAxis)
            .format(d3.time.format('%Y-%m-%d'))
            .width(45)
            .translate([0, height]);

    var crosshair = techan.plot.crosshair()
            .xScale(x)
            .yScale(y)
            .xAnnotation(timeAnnotation)
            .yAnnotation(ohlcAnnotation);

    /* Crosshair end */

    var svg = d3.select(this.element).html("").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("x", 0)
            .attr("y", y(1))
            .attr("width", width)
            .attr("height", y(0) - y(1));

    // svg.append('text')
    //         .attr("class", "symbol")
    //         .attr("x", 5)
    //         .text(name + " (" + symbol + ")");

    svg.append("g")
            .attr("class", "volume")
            .attr("clip-path", "url(#clip)");

    svg.append("g")
            .attr("class", "candlestick")
            .attr("clip-path", "url(#clip)");

    svg.append("g")
            .attr("class", "indicator sma ma-0")
            .attr("clip-path", "url(#clip)");

    // svg.append("g")
    //         .attr("class", "indicator sma ma-1")
    //         .attr("clip-path", "url(#clip)");

    // svg.append("g")
    //         .attr("class", "indicator ema ma-2")
    //         .attr("clip-path", "url(#clip)");

    svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")");

    svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + width + ",0)");

    svg.append("g")
            .attr("class", "volume axis");

    svg.append("rect")
            .attr("class", "pane")
            .attr("width", width)
            .attr("height", height)
            .call(zoom);

    /* Crosshair start */

    svg.append('g')
            .attr("class", "crosshair");

    /* Crosshair end */

    function load(data) {
      var accessor = candlestick.accessor();
      data = data.map(function (d) {
          return {
              date: d.date,
              open: +d.open,
              high: +d.high,
              low: +d.low,
              close: +d.close,
              volume: +d.volume
          };
      }).sort(function (a, b) {
          return d3.ascending(accessor.d(a), accessor.d(b));
      });
      if (data.length == 0) return;

      x.domain(techan.scale.plot.time(data, accessor).domain());
      y.domain(techan.scale.plot.ohlc(data, accessor).domain());
      yVolume.domain(techan.scale.plot.volume(data, accessor.v).domain());

      svg.select("g.candlestick").datum(data).call(candlestick);
      svg.select("g.volume").datum(data).call(volume);
      svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(1)(data)).call(sma0);
      svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(20)(data)).call(sma1);
      svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(50)(data)).call(ema2);

      svg.select("g.crosshair").call(crosshair).call(zoom);

      var zoomable = x.zoomable();
      zoomable.domain([0, data.length]); // Zoom in a little to hide indicator preroll

      draw();

      // Associate the zoom with the scale after a domain has been applied
      zoom.x(zoomable).y(y);
    }

    function reset() {
      zoom.scale(1);
      zoom.translate([0, 0]);
      draw();
    }

    function draw() {
      svg.select("g.x.axis").call(xAxis);
      svg.select("g.y.axis").call(yAxis);
      svg.select("g.volume.axis").call(volumeAxis);

      // We know the data does not change, a simple refresh that does not perform data joins will suffice.
      svg.select("g.candlestick").call(candlestick.refresh);
      svg.select("g.volume").call(volume.refresh);
      svg.select("g.sma.ma-0").call(sma0.refresh);
      svg.select("g.sma.ma-1").call(sma1.refresh);
      svg.select("g.ema.ma-2").call(ema2.refresh);
      svg.select("g.crosshair").call(crosshair.refresh);
    }

    load(this.chartData);
  }
}