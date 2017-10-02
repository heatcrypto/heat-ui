///<reference path='lib/AbstractTransaction.ts'/>
///<reference path='lib/GenericDialog.ts'/>
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
@Service('sendmessage')
@Inject('$q','user','heat')
class SendmessageService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, userMessage?: string): IGenericDialog {
    return new SendmessageDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey, userMessage);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition): boolean {
    return transaction.type === 1 && transaction.subtype === 0;
  }
}
class SendmessageDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string,
              private userMessage: string) {
    super($event);
    this.dialogTitle = 'Send Message';
    this.dialogDescription = 'Description on how to send message';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.account('recipient', this.recipient).
              label('Recipient').
              onchange(() => {
                this.fields['recipientPublicKey'].value = null;
                this.fields['message'].changed();
                this.heat.api.getPublicKey(this.fields['recipient'].value).then(
                  (publicKey) => {
                    this.fields['recipientPublicKey'].value = publicKey;
                    $scope.$evalAsync(()=>{
                      this.fields['message'].visible(true);
                      this.fields['messagWarning'].visible(false);
                    });
                  },()=>{
                    $scope.$evalAsync(()=>{
                      this.fields['message'].visible(false);
                      this.fields['messagWarning'].visible(true);
                    });
                  }
                );
              }).
              required(),
      builder.staticText('messagWarning', 'Message field will be visible only if the receiver account is known by the HEAT p2p network.')
             .visible(true),
      builder.text('message', this.userMessage).
              rows(2).
              visible(false).
              asyncValidate("No recipient public key", (message) => {
                let deferred = this.$q.defer<boolean>();
                if (String(message).trim().length == 0) {
                  deferred.resolve();
                }
                else {
                  if (this.fields['recipientPublicKey'].value) {
                    deferred.resolve();
                  }
                  else {
                    this.heat.api.getPublicKey(this.fields['recipient'].value).then(
                      (publicKey) => {
                        this.fields['recipientPublicKey'].value = publicKey;
                        deferred.resolve();
                      },
                      deferred.reject
                    );
                  }
                }
                return deferred.promise;
              }).
              label('Message'),
      builder.hidden('recipientPublicKey', this.recipientPublicKey)
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.standard)
           .attachment('ArbitraryMessage', <IHeatCreateArbitraryMessage>{
            });
    builder.recipient(this.fields['recipient'].value);
    builder.recipientPublicKey(this.fields['recipientPublicKey'].value);
    if (this.fields['message'].value) {
      builder.message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    }
    // if (angular.isDefined(this.bundle)) {
    //   builder.bundle(this.bundle);
    // }
    return builder;
  }
}