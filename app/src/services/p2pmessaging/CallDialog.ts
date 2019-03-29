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

    private channelListener: IEventListenerFunction;

    constructor($event,
                private heat: HeatService,
                private user: UserService,
                private recipient: string,
                private recipientPublicKey: string,
                private p2pmessaging: P2PMessaging) {
      super($event);
      this.dialogTitle = 'Send offchain connect request';
      this.dialogDescription = 'Connect other user to establish the peer-to-peer channel';
      this.okBtnTitle = 'Connect';
      this.okBtn['processing'] = false;
      this.customFeeTitle = 'NO FEE';
      this.okBtn['disabled'] = !recipient;
    }

    /* @override */
    getFields($scope: angular.IScope) {
      var builder = new DialogFieldBuilder($scope);
      return [
        builder
          .account('recipient', this.recipient)
          .label('Counterparty HEAT account id')
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
      if (this.channelListener) {
        this.p2pmessaging.removeListener(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, this.channelListener);
      }

      this.okBtn['processing'] = true;
      this.heat.api.getPublicKey(this.fields['recipient'].value).then(
        (publicKey) => {
          let room = this.p2pmessaging.getOneToOneRoom(publicKey);
          if (this.p2pmessaging.isPeerConnected(publicKey)) {
            this.okBtn['mdDialog'].hide(room);
            return;
          }

          setTimeout(() => {
            this.okBtn['scope'].$evalAsync(() => {
              this.okBtn['processing'] = false;
            });
          }, 7000);

          room = this.p2pmessaging.call(publicKey);

          this.channelListener = (roomParam: p2p.Room, peerId: string) => {
            if (roomParam.name == room.name) {
              this.okBtn['mdDialog'].hide(room);
              this.okBtn['processing'] = false;
              this.p2pmessaging.removeListener(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, this.channelListener);
            }
          };
          this.p2pmessaging.on(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, this.channelListener);

          let peerAccount = heat.crypto.getAccountIdFromPublicKey(publicKey);
          this.heat.api.searchPublicNames(peerAccount, 0, 100).then(accounts => {
            let expectedAccount = accounts.find(value => value.publicKey == publicKey);
            if (expectedAccount) {
              this.p2pmessaging.saveContact(peerAccount, publicKey, expectedAccount.publicName, -Date.now());
            }
          });
        }, reason => {
          this.okBtn['processing'] = false;
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
