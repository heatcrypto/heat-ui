/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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

@Service('latestBlocksProviderFactory')
@Inject('heat','$q')
class LatestBlocksProviderFactory  {
  constructor(private heat: HeatService, private $q: angular.IQService) {}

  public createProvider(): IPaginatedDataProvider {
    return new LatestBlocksProvider(this.heat, this.$q);
  }
}

class LatestBlocksProvider implements IPaginatedDataProvider {
  constructor(private heat: HeatService,
              private $q: angular.IQService) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getLength(): angular.IPromise<number> {
    var deferred = this.$q.defer();
    this.heat.api.getBlockchainStatus().then((status) => {
      deferred.resolve(status.numberOfBlocks);
    },deferred.reject);
    return deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatBlock>> {
    return this.heat.api.getBlocks(firstIndex, lastIndex);
  }

  public addObserver(observer: IPaginatedDataProviderObserver): (...args: any[]) => any { return null; }
  public removeObserver(observer: IPaginatedDataProviderObserver) { }
}