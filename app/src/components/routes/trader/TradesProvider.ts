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

@Service('tradesProviderFactory')
@Inject('heat','$q')
class TradesProviderFactory  {
  constructor(private heat: HeatService, private $q: angular.IQService) {}

  public createProvider(currency: string, asset: string, account?: string): IPaginatedDataProvider {
    return new TradesProvider(currency, asset, account, this.heat, this.$q);
  }
}

class TradesProvider implements IPaginatedDataProvider {

  constructor(private currency: string,
              private asset: string,
              private account: string,
              private heat: HeatService,
              private $q: angular.IQService) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    if (this.account) {
      return this.heat.api.getAccountTradesCount(this.account, this.currency, this.asset);
    }
    return this.heat.api.getTradesCount(this.currency, this.asset);
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatTrade>> {
    if (this.account) {
      return this.heat.api.getAccountTrades(this.account, this.currency, this.asset, firstIndex, lastIndex);
    }
    return this.heat.api.getTrades(this.currency, this.asset, firstIndex, lastIndex);
  }

  public addObserver(observer: IPaginatedDataProviderObserver): (...args: any[]) => any { return null; }
  public removeObserver(observer: IPaginatedDataProviderObserver) { }
}