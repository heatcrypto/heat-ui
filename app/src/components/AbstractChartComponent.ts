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
abstract class AbstractChartComponent {

  public refresh: Function;

  /* When fetching data assign your active promises to this property so the
   data table can display a loading animation */
  private promise = null;

  /* Data object that holds the rows */
  public data = null;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              public $timeout: angular.ITimeoutService) {
    this.refresh = utils.debounce(() => {
      this.promise = [
        this.getPage().then(() => {
          let margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = 960 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

          let x = techan.scale.financetime()
            .range([0, width]);

          let y = d3.scaleLinear()
            .range([height, 0]);

          let candlestick = techan.plot.candlestick()
            .xScale(x)
            .yScale(y);

          let xAxis = d3.axisBottom()
            .scale(x);

          let yAxis = d3.axisLeft()
            .scale(y);

          d3.selectAll('svg').remove();

          let svg = d3.select("#ohlcchart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          let parseDate = d3.timeParse("%d-%b-%y");
          let accessor = candlestick.accessor();
          let data = [];

          this.data.data.forEach(function (d) {
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
            .attr("class", "candlestick");

          svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")");

          svg.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Price ($)");

          draw(data);

          function convertToDate(date) {
            let format = 'dd-mmm-yy';
            let dateFormated = utils.timestampToDate(parseInt(date));
            return dateFormat(dateFormated, format);
          }

          function draw(data) {
            x.domain(data.map(candlestick.accessor().d));
            y.domain(techan.scale.plot.ohlc(data, candlestick.accessor()).domain());

            svg.selectAll("g.candlestick").datum(data).call(candlestick);
            svg.selectAll("g.x.axis").call(xAxis);
            svg.selectAll("g.y.axis").call(yAxis);
          }
        })
      ];
    }, 50, true);
  }

  abstract getPageItems(): angular.IPromise<Array<any>>;

  private getPage(): angular.IPromise<any> {
    return this.getPageItems().then(
      (items) => {
        this.$scope.$evalAsync(() => {
          this.data = items;
        })
      },
      (error) => {
        this.$scope.$evalAsync(() => {
          this.data = {};
        })
      }
    );
  }

  static template(headTemplate: string, bodyTemplate: string): string {
    return `
      <div layout="column" flex layout-fill>
        <h1>${headTemplate}</h1>
        ${bodyTemplate}
      </div>
    `
  }
}
