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

  private self = this;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              public $timeout: angular.ITimeoutService) {
    this.refresh = utils.debounce(() => {
      this.promise = [
        this.getPage().then(() => {
          let geoChartData = [];

          let requests = this.data.reduce((promiseChain, item) => {
            return promiseChain.then(() => new Promise((resolve) => {
              asyncFunction(item, resolve);
            }));
          }, Promise.resolve());

          requests.then(() => {
            let gdpKeys = ['Agriculture', 'Industry', 'Platform'];
            drawGeoChart(gdpKeys, geoChartData);
          });

          function drawGeoChart(gdpKeys, geoChartData) {
            let hasProp = {}.hasOwnProperty;
            let sliceColors = ["#2fc32f", "#b0dc0b", "#eab404", "#de672c"];
            let enableAggregation = true;
            let options = {
              area: {height: 800},
              container: document.getElementById("geo-chart"),
              background: {
                url: "https://maps.zoomcharts.com/{z}/{x}/{y}.png"
              },
              data: {
                id: "geoChart",
                perBoundsData: true,
                perZoomData: false,
                perDrilldownData: false,
                preloaded: {
                  nodes: geoChartData,
                }
              },
              layers: [
                {
                  id: "piePositions",
                  type: "items",
                  data: {
                    id: "geoChart"
                  },
                  aggregation: {
                    enabled: true,
                    distance: 70,
                    weightFunction: function (node) {
                      let sum = 0;
                      for (let key in node.gdp) {
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
                      let r;
                      if (enableAggregation) {
                        r = node.data.aggregatedWeight;
                      } else {
                        r = 0;
                        for (let key in node.data.gdp) {
                          if (hasProp.call(node.data.gdp, key)) {
                            r += node.data.gdp[key];
                          }
                        }
                      }
                      // in order to fit nodes on the chart, display the radius in a logarithmic scale
                      node.radius = Math.log(Math.max(2, r * 1e-6)) * 15;

                      // Show the country names, if an aggregation contains only 1 node
                      let aggr;
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
                    let aggr;
                    if (enableAggregation) {
                      aggr = data.aggregatedNodes;
                    } else {
                      aggr = [data];
                    }

                    if (aggr.settingsApplied) return {
                      pie: {radius: node.removed ? 1e-30 : node.radius - 3, innerRadius: 5}
                    };
                    aggr.settingsApplied = true;

                    let pieData = {subvalues: []};

                    // When displaying aggregated GDP of a region, summarize the GDP sectors
                    let gdp = {};
                    gdpKeys.forEach(function (key) {
                      gdp[key] = 0;
                    });

                    for (let i = 0; i < aggr.length; i++) {
                      let c = aggr[i];
                      for (let j in c.gdp) {
                        if (hasProp.call(gdp, j)) {
                          gdp[j] += c.gdp[j];
                        }
                      }
                    }
                    let radius = 0;
                    for (let key in gdp) {
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
          }

          function getCoordinatesByIP(ipAddress) {
            let deferred = $q.defer();
            let http = <HttpService> heat.$inject.get('http');
            http.get("http://ipinfo.io/" + ipAddress).then((response) => {
              let latitude = angular.isDefined(response['loc']) ? response['loc'].split(',')[0] : 0;
              let longitude = angular.isDefined(response['loc']) ? response['loc'].split(',')[1] : 0;

              //Coordinates must contain two values: [longitude, latitude].
              deferred.resolve([longitude, latitude]);
            }, deferred.reject);
            return deferred.promise;
          }

          //convert the ip address to coordinates and generate geo chart data
          function asyncFunction(item, callback) {
            setTimeout(() => {
              getCoordinatesByIP(item.address).then(function (coordinates) {
                geoChartData.push(
                  {
                    //gdp properties should be == gdpKeys
                    "gdp": {
                      "Platform": item.weight || 0,
                      "Agriculture": Math.floor(Math.random() * (1000000 - 100000 + 100000)) + 100000,
                      "Industry": Math.floor(Math.random() * (1000000 - 100000 + 100000)) + 1000000
                    },
                    "name": angular.isDefined(item.platform) ? item.platform : "",
                    "coordinates": coordinates,
                    "id": angular.isDefined(item.platform) ? item.platform : ""
                  }
                );
              });
              callback();
            }, 100);
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
