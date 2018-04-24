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

@Service('etherscanService')
@Inject('$q', 'http', 'settings','web3')
class EtherscanService {

  constructor(private $q: angular.IQService,
              private http: HttpService,
              private settingsService: SettingsService,
              private web3: Web3Service) { }

  public getEtherTransactions(address: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<string>();
    let url = this.settingsService.get(SettingsService.ETHERSCAN_TRANSACTION_URL)
      .replace(":address", address)
      .replace(":apiToken", this.settingsService.get(SettingsService.ETHERSCAN_API_TOKEN))
      .replace(":page", lastIndex/20)
      .replace(":offset", lastIndex-firstIndex)
    this.http.get(url)
      .then((response) => {
        var parsed = angular.isString(response) ? JSON.parse(response) : response;
        deferred.resolve(parsed.result);
      }, () => {
        deferred.resolve("");
      });
    return deferred.promise;
  }

  public getEtherBalances(addresses: string[]): angular.IPromise<Array<{address, balance}>> {
    let deferred = this.$q.defer<any>();
    let url = this.settingsService.get(SettingsService.ETHERSCAN_BALANCES_URL)
      .replace(":addresses", addresses.join(','))
      .replace(":apiToken", this.settingsService.get(SettingsService.ETHERSCAN_API_TOKEN))
    this.http.get(url).then(response => {
      if (response['status']=='1') {
        let balances = response['result'].map(entry => {
          return {
            address: entry.account,
            balanceWei: entry.balance,
            balance: this.web3.web3.fromWei(entry.balance)
          }
        })
        deferred.resolve(balances)
      }
      else {
        deferred.reject()
      }
    }, deferred.reject)
    return deferred.promise;
  }

  // List erc20 plus balances for an account https://api.ethplorer.io/getAddressInfo/0xe3031c1bfaa7825813c562cbdcc69d96fcad2087?apiKey=freekey

  /* This is not using the Etherscan API but the EthPlorer one */
  public getErc20Tokens(address: string): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = this.settingsService.get(SettingsService.ETHPLORER_INFO_URL)
                  .replace(":address", address)
    this.http.get(url).then(response => {

    }, () => {
      deferred.resolve([])
    })
    return deferred.promise
  }

  // public getEtplorerTransactions(address: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
  //   let deferred = this.$q.defer<string>();
  //   let url = "https://api.ethplorer.io/getAddressTransactions/:address?apiKey=freekey"


  //   let url = this.settingsService.get(SettingsService.ETHERSCAN_TRANSACTION_URL)
  //     .replace(":address", address)
  //     .replace(":apiToken", this.settingsService.get(SettingsService.ETHERSCAN_API_TOKEN))
  //     .replace(":page", lastIndex/20)
  //     .replace(":offset", lastIndex-firstIndex)
  //   this.http.get(url)
  //     .then((response) => {
  //       var parsed = angular.isString(response) ? JSON.parse(response) : response;
  //       deferred.resolve(parsed.result);
  //     }, () => {
  //       deferred.resolve(noData);
  //     });
  //   return deferred.promise;
  // }

  public getEthplorerTransactionCount(address: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`
    this.http.get(url).then(response => {
      deferred.resolve(parseInt(response['countTxs']))
    }, deferred.reject)
    return deferred.promise;
  }


}
