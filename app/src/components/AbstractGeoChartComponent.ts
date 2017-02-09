/*
 + * The MIT License (MIT)
 + * Copyright (c) 2016 Heat Ledger Ltd.
 + *
 + * Permission is hereby granted, free of charge, to any person obtaining a copy of
 + * this software and associated documentation files (the "Software"), to deal in
 + * the Software without restriction, including without limitation the rights to
 + * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 + * the Software, and to permit persons to whom the Software is furnished to do so,
 + * subject to the following conditions:
 + *
 + * The above copyright notice and this permission notice shall be included in all
 + * copies or substantial portions of the Software.
 + *
 + * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 + * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 + * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 + * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 + * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 + * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 + * SOFTWARE.
 + * */
abstract class AbstractGeoChartComponent {

  public refresh: Function;

  /* When fetching data assign your active promises to this property so the
   +   data table can display a loading animation */
  private promise = null;

  /* Data object that holds the rows */
  public data = null;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              public $timeout: angular.ITimeoutService) {
    this.refresh = utils.debounce(() => {
      this.promise = [
        this.getPage().then(() => {
          var http = <HttpService> heat.$inject.get('http');

          http.get("http://ipinfo.io/84.104.2.136").then((response)=>{
            let lats = response['loc'].split(',')[0];
            let lngs = response['loc'].split(',')[1];
            console.log(lats, lngs);
          });

          var hasProp = {}.hasOwnProperty;
          var sliceColors = ["#2fc32f", "#b0dc0b", "#eab404", "#de672c"];
          var enableAggregation = true;
          var options = {
            area: {height: 500},
            container: document.getElementById("demo"),
            background: {
              url: "https://maps.zoomcharts.com/{z}/{x}/{y}.png"
            },
            data: [
              {
                id: "gdp",
                url: "https://zoomcharts.com/dvsl/data/geo-chart/nominal_gdp_composition.json",
                perBoundsData: false
              }
            ],
            layers: [
              {
                id: "piePositions",
                type: "items",
                data: {
                  id: "gdp"
                },
                aggregation: {
                  enabled: true,
                  distance: 70,
                  weightFunction: function (node) {
                    var sum = 0;
                    for (var key in node.gdp) {
                      if (hasProp.call(node.gdp, key)) {
                        sum += node.gdp[key];
                      }
                    }
                    return sum;
                  }
                },
                style: {
                  nodeAutoScaling: null,
                  nodeStyleFunction: function (node) {
                    var r;
                    if (enableAggregation) {
                      r = node.data.aggregatedWeight;
                    } else {
                      r = 0;
                      for (var key in node.data.gdp) {
                        if (hasProp.call(node.data.gdp, key)) {
                          r += node.data.gdp[key];
                        }
                      }
                    }
                    // in order to fit nodes on the chart, display the radius in a logarithmic scale
                    node.radius = Math.log(Math.max(2, r * 1e-6)) * 15;

                    // Show the country names, if an aggregation contains only 1 node
                    var aggr;
                    if (enableAggregation) {
                      aggr = node.data.aggregatedNodes;
                    } else {
                      aggr = [node];
                    }
                    if (aggr.length === 1) {
                      node.label = aggr[0].id;
                    } else {
                      node.display = "image";
                      node.label = "" + aggr.length + "&nbsp;countries";
                    }
                  },
                  node: {
                    radius: void 0,
                    fillColor: "rgba(0, 0, 0, 0.9)",
                    lineColor: null,
                    label: "",
                    display: "droplet"
                  },
                  nodeHovered: {
                    shadowColor: "black"
                  },
                  nodeLabel: {
                    backgroundStyle: {
                      fillColor: "rgba(0, 0, 0, 0.9)",
                      lineColor: "rgba(0, 0, 0, 0.9)"
                    },
                    textStyle: {
                      fillColor: "#ccc"
                    }
                  },
                  removedColor: null
                }
              }, {
                id: "pie",
                type: "charts",
                shapesLayer: "piePositions",
                chartType: "piechart",
                settingsFunction: function (node, data) {
                  var aggr;
                  if (enableAggregation) {
                    aggr = data.aggregatedNodes;
                  } else {
                    aggr = [data];
                  }

                  if (aggr.settingsApplied) return {
                    pie: {radius: node.removed ? 1e-30 : node.radius - 3, innerRadius: 5}
                  };
                  aggr.settingsApplied = true;

                  var pieData = {subvalues: []};

                  // When displaying aggregated GDP of a region, summarize the GDP sectors
                  var gdp = {
                    Agriculture: 0,
                    Industry: 0,
                    Service: 0
                  };
                  for (var i = 0; i < aggr.length; i++) {
                    var c = aggr[i];
                    for (var j in c.gdp) {
                      if (hasProp.call(gdp, j)) {
                        gdp[j] += c.gdp[j];
                      }
                    }
                  }
                  var radius = 0;
                  for (var key in gdp) {
                    if (hasProp.call(gdp, key)) {
                      pieData.subvalues.push({
                        value: gdp[key],
                        name: key
                      });
                    }
                  }
                  return {
                    pie: {
                      radius: node.radius - 3,
                      innerRadius: 5,
                      style: {
                        sliceColors: sliceColors,
                        colorDistribution: "list"
                      }
                    },
                    data: {
                      preloaded: pieData
                    },
                    labels: {enabled: false},
                    info: {
                      contentsFunction: function (data) {
                        return "" + data.name + " " + data.value.toLocaleString() + "M $";
                      }
                    }
                  };
                }
              }
            ],
            navigation: {
              initialLat: 30,
              initialLng: 10,
              initialZoom: 2
            }
          };
          let chart = new GeoChart(options);

          var toggle = document.getElementById("enableAggr");
          if (toggle) {
            toggle.addEventListener("change", function () {
              enableAggregation = this.checked;
              options.layers[0].aggregation.enabled = enableAggregation;
              chart.updateSettings({
                layers: options.layers
              });
            });
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
