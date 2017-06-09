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
module dialogs {
  export function loadBtc($event, asset: string) {
    var http = <HttpService> heat.$inject.get('http');
    var user = <UserService> heat.$inject.get('user');
    var $q = <angular.IQService> heat.$inject.get('$q');
    var env = <EnvService> heat.$inject.get('env');
    var url = env.type == EnvType.BROWSER ?
      `https://heatwallet.com/getaddr.cgi?heataccount=${user.account}&publickey=${user.publicKey}&aid=${asset}` :
      `http://heatledger.com/getaddr.cgi?heataccount=${user.account}&publickey=${user.publicKey}&aid=${asset}`;
    var deferred = $q.defer();
    http.get(url).then((response)=>{
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      if (parsed.deposit && angular.isString(parsed.deposit.address)) {
        var btcAddress = parsed.deposit.address;
        dialogs.dialog({
          id: 'loadBtc',
          title: 'Load BTC',
          targetEvent: $event,
          okButton: true,
          template: `
            <div flex>
              Please transfer the desired amount of Bitcoins to <b>{{vm.address}}</b>. When the transfer has 1 confirmation in the Bitcoin network, your HEAT account will receive the BTC Assets (id: 5592059897546023466) shortly and you can trade them in any market they're accepted at.
              <br><br>
              BTC Load fee is 0%.
              <br><br>
              BTC redemption (cashout) fee is 0.25%, minimum 0.001 BTC. Processing time 0-24 hours.
              <br><br>
              To redeem your BTC asset for real Bitcoins, Click Transfer Asset from top right menu, choose Asset: BTC (5592059897546023466) Receiver: 9583431768758058558 and Amount: the desired cashout amount. Enter in payment message the desired Bitcoin address you want the Bitcoins to be sent. Do not enter anything else in the payment message.
              <br><br>
              For any questions please contact <a href="mailto:support@heatledger.com">support@heatledger.com</a>
            </div>
          `,
          locals: {
            address: btcAddress
          }
        }).then(deferred.resolve, deferred.reject);
      }
    });
    return deferred.promise;
  }
}