/*
 * The MIT License (MIT)
 * Copyright (c) 2019 Heat Ledger Ltd.
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

module p2p {

  /**
   * Dialog for calling other user to establish WebRTC channel.
   */
  export class CallDialog extends GenericDialog {

    constructor($event,
                private heat: HeatService,
                private user: UserService,
                private recipient: string,
                private recipientPublicKey: string,
                private p2pmessaging: P2PMessaging) {
      super($event);
      this.dialogTitle = 'Call user';
      this.dialogDescription = 'Call other user to establish the peer-to-peer channel';
      this.okBtnTitle = 'Call';
      this.okBtn['disabled'] = false;
    }

    /* @override */
    getFields($scope: angular.IScope) {
      var builder = new DialogFieldBuilder($scope);
      return [
        builder
          .account('recipient', this.recipient)
          .label('Callee')
          .required()
          .onchange(newValue => this.onChangeRecipient($scope, newValue)),
        // builder.text('note', '').readonly(true),
        builder.hidden('recipientPublicKey', this.recipientPublicKey)
      ]
    }

    getTransactionBuilder(): TransactionBuilder {
      return undefined;
    }

    okBtn() {
      this.okBtn['disabled'] = true;
      this.heat.api.getPublicKey(this.fields['recipient'].value).then(
        (publicKey) => {
          let room = this.p2pmessaging.getOneToOneRoom(publicKey);
          if (this.p2pmessaging.isPeerConnected(publicKey)) {
            this.okBtn['mdDialog'].hide(room);
            return;
          }

          setTimeout(() => {
            this.okBtn['scope'].$evalAsync(() => {
              this.okBtn['disabled'] = false;
            });
          }, 4000);

          room = this.p2pmessaging.call(publicKey);
          room.onOpenDataChannel = peerId => {
            this.okBtn['mdDialog'].hide(room);
          };

          let peerAccount = heat.crypto.getAccountIdFromPublicKey(publicKey);
          this.heat.api.searchPublicNames(peerAccount, 0, 100).then(accounts => {
            let expectedAccount = accounts.find(value => value.publicKey == publicKey);
            if (expectedAccount) {
              this.p2pmessaging.saveContact(peerAccount, publicKey, expectedAccount.publicName);
            }
          });
        }, reason => {
        }
      );
    }

    private onChangeRecipient($scope: angular.IScope, newRecipient) {
      $scope.$evalAsync(() => {
        this.okBtn['disabled'] = this.user.account == newRecipient;
      });
    }

  }

}
