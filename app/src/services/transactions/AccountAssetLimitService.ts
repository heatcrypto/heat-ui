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
@Service('accountAssetLimit')
@Inject('$q', 'user', 'heat')
class AccountAssetLimitService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new AccountAssetLimitDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey);
  }

  verify(transaction: any, attachment: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type != 4 || transaction.subtype != 3) return false;

    transaction.assetId = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.amount = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.interval = converters.byteArrayToSignedInt32(attachment.byteArray, attachment.pos);
    attachment.pos += 4;

    return transaction.assetId === data.AccountAssetLimit.assetId
      && transaction.amount === data.AccountAssetLimit.amount
      && transaction.interval === data.AccountAssetLimit.interval;
  }
}

class AccountAssetLimitDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = 'Set max asset amount per interval that account can to send';
    this.dialogDescription = 'Description';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.accountAssetLimitFee, 8).replace(/000000$/, '');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
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
      builder.asset('asset')
        .label('Asset')
        .searchAllAssets(true)
        .onchange(() => {
          /* when the asset changes we update the symbol and precission of the amount field */
          let amountField = <DialogFieldMoney>this.fields['amount'];
          let assetField = <DialogFieldAsset>this.fields['asset'];
          let assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
          if (assetInfo) {
            amountField.symbol(assetInfo.symbol);
            amountField.precision(assetInfo.decimals);
            $scope.$evalAsync(() => {
              amountField.value = "0"
              amountField.changed(true)
            });
          }
        }),
      builder
        .money('amount')
        .label('Amount')
        .required()
        .precision(8)
        .symbol(''),
      builder.text('interval')
        .label('Interval (in seconds)')
        .required(),
      builder.hidden('recipientPublicKey', this.recipientPublicKey)
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let interval = parseInt(this.fields['interval'].value);
    let builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .recipient(this.fields['recipient'].value)
      .recipientPublicKey(this.fields['recipientPublicKey'].value)
      .feeNQT(HeatAPI.fee.accountAssetLimitFee)
      .attachment('AccountAssetLimit', <IHeatCreateAccountAssetLimit>{
        assetId: this.fields['asset'].value,
        amount: this.fields['amount'].value,
        interval: interval
      });
    return builder;
  }

}
