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

interface IEtherscanTransaction {
  blockNumber: string;
  timeStamp: Long;
  hash: string;
  nonce: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: number;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: number;
  confirmations: string;
  abi:any
}

@Service('ethTransactionsProviderFactory')
@Inject('http','$q','etherscanService','ethTransactionParser')
class EthTransactionsProviderFactory  {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private etherscanService: EtherscanService,
              private ethTransactionParser: EthTransactionParserService) {}

  public createProvider(account: string): IPaginatedDataProvider {
    return new EthTransactionsProvider(this.http, this.$q, this.etherscanService, this.ethTransactionParser, account);
  }
}

class EthTransactionsProvider implements IPaginatedDataProvider {
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private etherscanService: EtherscanService,
              private ethTransactionParser: EthTransactionParserService,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>()
    this.etherscanService.getEthplorerTransactionCount(this.account).then(deferred.resolve, deferred.reject)
    return deferred.promise
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IEtherscanTransaction>> {
    let deferred = this.$q.defer<Array<IEtherscanTransaction>>()
    this.etherscanService.getEtherTransactions(this.account, firstIndex, lastIndex).then(
      transactions => {
        this.ethTransactionParser.parse(transactions).then(deferred.resolve, deferred.reject)
      },
      deferred.reject
    )
    return deferred.promise
  }
}
