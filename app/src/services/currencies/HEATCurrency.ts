/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
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

class HEATCurrency implements ICurrency {

  private heat: HeatService
  private sendmoney: SendmoneyService
  public symbol = 'HEAT'
  public homePath

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.heat = heat.$inject.get('heat')
    this.sendmoney = heat.$inject.get('sendmoney')
    this.homePath = `/explorer-account/${this.address}/transactions`
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.heat.api.getAccountBalanceVirtual(this.address, "0", "0", 1).then(
      balance => {
        var formatted = utils.formatQNT(balance.virtualBalance, 8)
        return formatted
      }
    )
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void {
    return this.heat.subscriber.balanceChanged({account: this.address}, handler);
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {
    /* Ignore this since not needed for HEAT */
  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {
    this.sendmoney.dialog($event).show();
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }
}
