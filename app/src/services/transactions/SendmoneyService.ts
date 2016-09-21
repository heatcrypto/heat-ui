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
@Service('sendmoney')
@Inject('$q','address','engine','user','cloud')
class SendmoneyService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private address: AddressService,
              engine: EngineService,
              private user: UserService,
              private cloud: CloudService) {
    super('sendMoney', engine)
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, amount?: string, userMessage?: string, bundle?: ReplicatorBundle): IGenericDialog {
    return new SendmoneyDialog($event, this, this.$q, this.address, this.user, this.cloud, recipient, recipientPublicKey, amount, userMessage, bundle);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition): boolean {
    return transaction.type === 0 && transaction.subtype === 0;
  }
}

class SendmoneyDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private address: AddressService,
              private user: UserService,
              private cloud: CloudService,
              private recipient: string,
              private recipientPublicKey: string,
              private amount: string,
              private userMessage: string,
              private bundle: ReplicatorBundle) {
    super($event);
    this.dialogTitle = 'Send HEAT';
    this.dialogDescription = 'Description on how to send money';
    this.okBtnTitle = 'SEND';

    this.recipient = this.recipient || '';
    this.amount = this.amount || '0';
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
                this.cloud.api.getPublicKey(this.fields['recipient'].value).then(
                  (publicKey) => {
                    this.fields['recipientPublicKey'].value = publicKey;
                  }
                );
              }).
              required(),
      builder.money('amount', this.amount).
              label('Amount').
              required().
              precision(8).
              symbol(this.user.accountColorName).
              asyncValidate("Not enough funds", (amountNQT) => {
                var deferred = this.$q.defer();
                this.transaction.engine.socket().api.getAccount(this.user.accountRS).then(
                  (response: IGetAccountResponse) => {
                    var available: jsbn.BigInteger = new BigInteger(response.unconfirmedBalanceNQT);
                    var total: jsbn.BigInteger = new BigInteger(amountNQT).add(new BigInteger(this.transaction.engine.getBaseFeeNQT()));
                    if (available.compareTo(total) > 0) {
                      deferred.resolve();
                    }
                    else {
                      deferred.reject();
                    }
                  }, deferred.reject);
                return deferred.promise;
              }),
      builder.text('message', this.userMessage).
              rows(2).
              asyncValidate("No recipient public key", (message) => {
                var deferred = this.$q.defer();
                if (String(message).trim().length == 0 || !this.fields['recipient'].value) {
                  deferred.resolve();
                }
                else {
                  if (this.fields['recipientPublicKey'].value) {
                    deferred.resolve();
                  }
                  else {
                    this.cloud.api.getPublicKey(this.fields['recipient'].value).then(
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
              amountNQT: this.fields['amount'].value,
              recipientPublicKey: this.fields['recipientPublicKey'].value,
            });
    if (this.fields['message'].value) {
      builder.message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    }
    if (angular.isDefined(this.bundle)) {
      builder.bundle(this.bundle);
    }
    return builder;
  }
}
