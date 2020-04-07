///<reference path='lib/AbstractTransaction.ts'/>
///<reference path='lib/GenericDialog.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Heat Ledger Ltd.
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
@Service('assetAssignFees')
@Inject('$q', 'user', 'heat')
class AssetAssignFeesService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new AssetAssignFeesServiceDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type != 2 || transaction.subtype != 11) return false;

    transaction.assetId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.tradeFee = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    transaction.orderFee = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    transaction.feeRecepient = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;

    return transaction.assetId === data.AssetAssignFees.assetId
      && transaction.tradeFee === data.AssetAssignFees.tradeFee
      && transaction.orderFee === data.AssetAssignFees.orderFee
      && transaction.feeRecepient === (data.AssetAssignFees.feeRecipient || '0');
  }
}

class AssetAssignFeesServiceDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = 'Assign fees for private asset';
    this.dialogDescription = 'Assign fees for private asset';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.assetAssignFee, 8).replace(/000000$/, '');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.asset('asset')
        .label('Your private asset')
        .validate("You dont own this asset", (value) => {
          if (value == "0") return true;
          let assetField = <DialogFieldAsset>this.fields['asset'];
          let assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
          return !!assetInfo;
        }).required(),
      builder
        .text('orderFee', 0)
        .label('Order Fee (scale 1000000 = 1%)')
        .required(),
      builder
        .text('tradeFee', 0)
        .label('Trade Fee (scale 1000000 = 1%)')
        .required(),
      builder
        .account('feeRecipient')
        .label('Account for receiving fees')
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .feeNQT(HeatAPI.fee.assetAssignFee)
      .attachment('AssetAssignFees', <IHeatCreateAssetAssignFees>{
        assetId: this.fields['asset'].value,
        tradeFee: parseInt(this.fields['tradeFee'].value),
        orderFee: parseInt(this.fields['orderFee'].value),
        feeRecipient: this.fields['feeRecipient'].value
      });
    return builder;
  }


}
