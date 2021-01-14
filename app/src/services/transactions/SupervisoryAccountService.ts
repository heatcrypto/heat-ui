///<reference path='lib/AbstractTransaction.ts'/>
///<reference path='lib/GenericDialog.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2021 Heat Ledger Ltd.
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
@Service('supervisoryAccount')
@Inject('$q', 'user', 'heat')
class SupervisoryAccountService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new SupervisoryAccountServiceDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey);
  }

  verify(transaction: any, attachment: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    return transaction.type === 4 && transaction.subtype === 2;
  }
}

class SupervisoryAccountServiceDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = "Assigning the recipient's control over the sender";
    this.dialogDescription = 'Puts the sender account under the control of the recipient';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.supervisoryAccountFee, 8).replace(/000000$/, '');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    let builder = new DialogFieldBuilder($scope);
    return [
      builder.account('recipient', this.recipient)
        .label('Recipient')
        .onchange(() => {
          this.fields['recipientPublicKey'].value = null;
          this.heat.api.getPublicKeyOrEmptyString(this.fields['recipient'].value).then(
            (publicKey) => {
              /* account exists but has no public key */
              if (publicKey == '') {
                $scope.$evalAsync(() => {
                  this.fields['recipient']['accountExists'] = true;
                });
              } else {
                this.fields['recipientPublicKey'].value = publicKey;
                $scope.$evalAsync(() => {
                  this.fields['recipient']['accountExists'] = true;
                });
              }
            }, () => {
              $scope.$evalAsync(() => {
                this.fields['recipient']['accountExists'] = false
              });
            }
          );
        })
        .required(),
      builder.hidden('recipientPublicKey', this.recipientPublicKey)
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .feeNQT(HeatAPI.fee.supervisoryAccountFee)
      .attachment('SupervisoryAccount', <IHeatCreateSupervisoryAccount>{})
      .recipient(this.fields['recipient'].value)
      .recipientPublicKey(this.fields['recipientPublicKey'].value);
    return builder;
  }

}
