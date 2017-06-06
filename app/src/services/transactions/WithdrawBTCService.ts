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
@Service('withdrawBTC')
@Inject('$q','user','heat')
class WithdrawBTCService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, amount?: string, userMessage?: string): IGenericDialog {
    return new WithdrawBTCDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey, amount, userMessage);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition): boolean {
    return transaction.type === 0 && transaction.subtype === 0;
  }
}

class WithdrawBTCDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string,
              private amount: string,
              private userMessage: string) {
    super($event);
    this.dialogTitle = 'Withdraw BTC';
    this.dialogDescription = 'Description on how to withdraw BTC';
    this.okBtnTitle = 'WITHDRAW';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
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
                this.heat.api.getPublicKey(this.fields['recipient'].value).then(
                  (publicKey) => {
                    this.fields['recipientPublicKey'].value = publicKey;
                    $scope.$evalAsync(()=>{
                      this.fields['message'].visible(true);
                    });
                  },()=>{
                    $scope.$evalAsync(()=>{
                      this.fields['message'].visible(false);
                    });
                  }
                );
              }).
              required(),
      builder.money('amount', this.amount).
              label('Amount').
              required().
              precision(8).
              symbol(this.user.accountColorName).
              asyncValidate("Not enough funds", (amount) => {
                var deferred = this.$q.defer();
                this.heat.api.getAccountBalance(this.user.account, '0').then(
                  (balance: IHeatAccountBalance) => {
                    try {
                      var avail = new Big(balance.unconfirmedBalance);
                      var total = new Big(amount).add(new Big(HeatAPI.fee.standard));
                      if (avail.gte(total) > 0) {
                        deferred.resolve();
                      }
                      else {
                        deferred.reject();
                      }
                    } catch (e) {
                      deferred.reject();
                    }
                  }, deferred.reject);
                return deferred.promise;
              }),
      builder.text('message', this.userMessage).
              rows(2).
              visible(false).
              asyncValidate("No recipient public key", (message) => {
                var deferred = this.$q.defer();
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
           .attachment('OrdinaryPayment', <IHeatCreateOrdinaryPayment>{
              amountHQT: this.fields['amount'].value
            });
    builder.recipient(this.fields['recipient'].value);
    builder.recipientPublicKey(this.fields['recipientPublicKey'].value);
    if (this.fields['message'].value) {
      builder.message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    }
    return builder;
  }
}
