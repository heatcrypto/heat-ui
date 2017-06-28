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
  export function depositAsset($event, assetInfo: AssetInfo) {
    var http = <HttpService> heat.$inject.get('http');
    var user = <UserService> heat.$inject.get('user');
    var $q = <angular.IQService> heat.$inject.get('$q');
    var env = <EnvService> heat.$inject.get('env');
    var url = env.type == EnvType.BROWSER ?
      `https://heatwallet.com/getaddr.cgi?heataccount=${user.account}&publickey=${user.publicKey}&aid=${assetInfo.id}` :
      `http://heatledger.com/getaddr.cgi?heataccount=${user.account}&publickey=${user.publicKey}&aid=${assetInfo.id}`;
    var deferred = $q.defer();
    http.get(url).then((response)=>{
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      dialogs.dialog({
        id: 'depositAsset',
        title: `Deposit ${assetInfo.symbol}`,
        targetEvent: $event,
        okButton: true,
        template: `
          <div flex ng-bind-html="vm.dialogue"></div>
        `,
        locals: {
          dialogue: parsed.deposit.dialogue
        }
      }).then(deferred.resolve, deferred.reject);
    });
    return deferred.promise;
  }
}