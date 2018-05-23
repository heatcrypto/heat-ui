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

@Service('ethTransactionsProviderFactory')
@Inject('http','$q','ethplorer','ethTransactionParser')
class EthTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private ethplorer: EthplorerService,
              private ethTransactionParser: EthTransactionParserService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new EthTransactionsProvider(this.http, this.$q, this.ethplorer, this.ethTransactionParser, account);
  }
}

class EthTransactionsProvider implements IPaginatedDataProvider {

  private paginator: EthplorerTransactionPaginator
  private lastIndex: number = 0

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private ethplorer: EthplorerService,
              private ethTransactionParser: EthTransactionParserService,
              private account: string) {
    this.paginator = ethplorer.createPaginator(account)
  }

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.paginator.getCount().then(count => {
      deferred.resolve(Math.min(this.lastIndex + 40, count))
    }, deferred.reject)
    return deferred.promise
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<EthplorerAddressTransactionExtended>> {
    let deferred = this.$q.defer<Array<EthplorerAddressTransaction>>()
    if (lastIndex > this.lastIndex) {
      this.lastIndex = lastIndex
    }
    this.paginator.getItems(firstIndex, lastIndex).then(
      transactions => {
        deferred.resolve(this.ethTransactionParser.parse(transactions))
      },
      deferred.reject
    )
    return deferred.promise
  }

}
