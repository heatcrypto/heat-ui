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

@Service('transactionsProviderFactory')
@Inject('heat','$q')
class TransactionsProviderFactory  {
  constructor(private heat: HeatService, private $q: angular.IQService) {}

  public createProvider(account: string, block: string, transactionObject: IHeatTransaction): IPaginatedDataProvider {
    return new TransactionsProvider(this.heat, this.$q, account, block, transactionObject);
  }
}

class TransactionsProvider implements IPaginatedDataProvider {
  constructor(private heat: HeatService,
              private $q: angular.IQService,
              private account: string,
              private block: string,
              private transactionObject: IHeatTransaction) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getLength(): angular.IPromise<number> {
    if (angular.isString(this.account)) {
      return this.heat.api.getTransactionsForAccountCount(this.account);
    }
    else if (angular.isString(this.block)) {
      return this.heat.api.getTransactionsForBlockCount(this.block);
    }
    else if (angular.isDefined(this.transactionObject)) {
      let deferred = this.$q.defer();
      deferred.resolve(1);
      return deferred.promise;
    }
    return this.heat.api.getTransactionsForAllCount();
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatTransaction>> {
    if (angular.isString(this.account)) {
      return this.heat.api.getTransactionsForAccount(this.account, firstIndex, lastIndex);
    }
    else if (angular.isString(this.block)) {
      return this.heat.api.getTransactionsForBlock(this.block, firstIndex, lastIndex);
    }
    else if (angular.isDefined(this.transactionObject)) {
      let deferred = this.$q.defer();
      deferred.resolve([this.transactionObject]);
      return deferred.promise;
    }
    return this.heat.api.getTransactionsForAll(firstIndex, lastIndex);
  }

  public addObserver(observer: IPaginatedDataProviderObserver): (...args: any[]) => any { return null; }
  public removeObserver(observer: IPaginatedDataProviderObserver) { }
}