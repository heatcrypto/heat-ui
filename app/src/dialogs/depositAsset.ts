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
    var env = <EnvService> heat.$inject.get('env');
    var url = `https://heatwallet.com/getaddr.cgi?heataccount=${user.account}&publickey=${user.publicKey}&aid=${assetInfo.id}`;
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
          <div ng-if="vm.isBtc">
            Transfer the desired amount of Bitcoins to your Heatwallet's Bitcoin address:<br>
            <b>{{vm.address}}</b><a href='https://blocktrail.com/BTC/address/{{vm.address}}/transactions' target='_blank'>click to view pending</a><br>
            <div class="qrcodeBox" id="depositeAddressQRCode"></div>
            (This address changes after single deposit).<br><br>
            When the transfer has 1 confirmation in the Bitcoin network, your HEAT account will receive the Bitcoin Assets (id: 5592059897546023466) shortly and you can trade them in any market they're accepted at.<br><br>
            Bitcoin Deposit fee is 0%. Bitcoin redemption (withdrawal) fee is 0.40%, minimum fee 0.0015 Bitcoin due to Bitcoin network tx fees. To mitigate the risks of early phase decentralized blockchain rollbacks, The Heat Ledger Bitcoin gateway does not currently use automated hot wallets. Standard processing time is 0-12 hours, sometimes longer on non-business days.<br><br>
            Please do NOT send Bitcoin directly from another 3rd party exchange as deposits to Heat Wallet need to have an unique txid associated.
          </div>

          <div ng-if="!vm.isBtc" ng-bind-html="vm.dialogue"></div>

        `,
        locals: {
          dialogue: parsed.deposit.dialogue, isBtc: parsed.deposit.dialogue.includes('5592059897546023466'), address:parsed.deposit.address, shorQR: function() {
            showQrCodeOnDialogLoad(parsed.deposit.address);
          }()
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