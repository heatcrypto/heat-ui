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
let QRCode:any;
module dialogs {
  export function depositAsset($event, assetInfo: AssetInfo) {
    var http = <HttpService> heat.$inject.get('http');
    var user = <UserService> heat.$inject.get('user');
    var $q = <angular.IQService> heat.$inject.get('$q');
    var clipboard = <ClipboardService> heat.$inject.get('clipboard');
    var localKeyStore = <LocalKeyStoreService> heat.$inject.get('localKeyStore');
    var env = <EnvService> heat.$inject.get('env');

    var account = user.account, publicKey = user.publicKey
    if (user.currency.symbol != 'HEAT') {
      account = localKeyStore.list()[0]
      publicKey = 'xx-yy-zz'
    }

    var url = `https://heatwallet.com/getaddr.cgi?heataccount=${account}&publickey=${publicKey}&aid=${assetInfo.id}`;
    var deferred = $q.defer();
    http.get(url).then((response)=>{
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      dialogs.dialog({
        id: 'depositAsset',
        title: `Deposit ${assetInfo.symbol}`,
        targetEvent: $event,
        okButton: true,
        style: `
          .qrcodeBox {
            margin:10px;
          }
        `,
        template: `
          <div>
            <p>{{vm.symbol}} Deposit address <b id="deposit-dialog-btc-address-element">{{vm.address}}</b>&nbsp;<a ng-click="vm.copyAddress()">[copy]</a></p>
            <p><div class="qrcodeBox" id="depositeAddressQRCode"></div></p>
            <p></p>
            <p>
              <div ng-bind-html="vm.dialogue"></div>
            </p>
          </div>
        `,
        locals: {
          dialogue: parsed.deposit.dialogue,
          isBtc: parsed.deposit.dialogue.includes('5592059897546023466'),
          address:parsed.deposit.address,
          shorQR: function() {
            showQrCodeOnDialogLoad(parsed.deposit.address);
          }(),
          copyAddress: function () {
            clipboard.copyWithUI(document.getElementById('deposit-dialog-btc-address-element'), 'Copied address to clipboard');
          },
          symbol: assetInfo.symbol
        }
      }).then(deferred.resolve, deferred.reject);
    });
    return deferred.promise;
  }

  function showQrCodeOnDialogLoad(data) {
      setTimeout(() => {
        new QRCode("depositeAddressQRCode", {
          text: data,
          width: 128,
          height: 128,
          colorDark : "#000000",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.H
        });
      }, 1000);
  }
}