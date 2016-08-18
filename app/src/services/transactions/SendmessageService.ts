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
@Inject('$q','address','engine','user','cloud')
class SendmessageService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private address: AddressService,
              engine: EngineService,
              private user: UserService,
              private cloud: CloudService) {
    super('sendMessage', engine)
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, userMessage?: string, bundle?: ReplicatorBundle): IGenericDialog {
    return new SendmessageDialog($event, this, this.$q, this.address, this.user, this.cloud, recipient, recipientPublicKey, userMessage, bundle);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition): boolean {
    return transaction.type === 1 && transaction.subtype === 0;
  }
}

class SendmessageDialog extends GenericDialog {

  public readonlyRecipient: boolean;
  public messageType: TransactionMessageType;

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private address: AddressService,
              private user: UserService,
              private cloud: CloudService,
              private recipient: string,
              private recipientPublicKey: string,
              private userMessage: string,
              private bundle: ReplicatorBundle) {
    super($event);
    this.dialogTitle = 'Send Message';
    this.dialogDescription = 'Description on how to send message';
    this.okBtnTitle = 'SEND';

    this.readonlyRecipient = angular.isString(this.recipient);
    this.recipient = this.recipient || '';
    this.userMessage = this.userMessage || '';
    this.messageType = TransactionMessageType.TO_RECIPIENT;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.account('recipient', this.recipient).
              label('Recipient').
              readonly(this.readonlyRecipient).
              required().
              asyncValidate("Recipient does not have a publickey", (recipient) => {
                var deferred = this.$q.defer();
                this.cloud.api.getPublicKey(recipient).then(
                  (publicKey) => {
                    this.fields['recipientPublicKey'].value = publicKey;
                    deferred.resolve();
                  },
                  deferred.reject
                );
                return deferred.promise;
              }),
      builder.text('message', this.userMessage).
              label('Message'),
      builder.hidden('recipientPublicKey', this.recipientPublicKey).required()
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.deadline(1440).
            feeNQT(this.transaction.engine.getBaseFeeNQT()).
            secretPhrase(this.user.secretPhrase).
            json({
              recipient: this.address.rsToNumeric(this.fields['recipient'].value),
              recipientPublicKey: this.fields['recipientPublicKey'].value
            }).
            message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    if (angular.isDefined(this.bundle)) {
      builder.bundle(this.bundle);
    }
    return builder;
  }
}
