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
@Service('whitelistMarket')
@Inject('$q','user','heat')
class WhitelistMarketService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new WhitelistMarketferDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey);
  }

  verify(transaction: any, attachment: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 9) return false;

    transaction.currencyId = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.assetId = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;

    let result = transaction.currencyId === data.WhitelistMarket.currencyId &&
      transaction.assetId === data.WhitelistMarket.assetId;

    if (attachment.attachmentVersion > 1) {
      transaction.isIssuerFeePayer = attachment.byteArray[attachment.pos] == 1;
      attachment.pos += 1;
      result = result && transaction.isIssuerFeePayer === data.WhitelistMarket.isIssuerFeePayer;
    }

    return result;
  }
}

class WhitelistMarketferDialog extends GenericDialog {

  private assetIsPrivate: boolean
  private currencyIsPrivate: boolean

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = 'Whitelist Market (update the market)';
    this.dialogDescription = 'Description on how to whitelist a market';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.whitelistMarket, 8).replace(/000000$/,'');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    let networkNote = "NETWORK FEE MIN 0.01 HEAT FOR EVERY SUBMITTED ORDER"
    let builder = new DialogFieldBuilder($scope);
    return [
      builder.asset('asset')
        .label('Your asset')
        .onchange(newValue => {
          this.assetIsPrivate = newValue && this.isSelectedAssetPrivate(newValue)
          this.fields['issuerFeePayer'].visible(this.assetIsPrivate || this.currencyIsPrivate)
          if (this.isSelectedAssetExpired(newValue)) this.fields['asset'].setValue("")
        })
        .validate("You dont own this asset", (value) => {
                if (value == "0")
                  return true;
                var assetField = <DialogFieldAsset> this.fields['asset'];
                var assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
                return !!assetInfo;
              }).
              required(),
      builder.asset('currency')
        .label('Allow market')
        .searchAllAssets(true)
        .required()
        .onchange(newValue => {
          this.currencyIsPrivate = newValue && this.isSelectedAssetPrivate(newValue)
          this.fields['issuerFeePayer'].visible(this.assetIsPrivate || this.currencyIsPrivate)
          if (this.isSelectedAssetExpired(newValue)) this.fields['currency'].setValue("")
        }),
      builder.switcher('issuerFeePayer', false)
        .label('Network fee paid by')
        .valueLabels("ISSUER", "SENDER")
        .valueNotes(networkNote, networkNote)
        .visible(false) //will be visible when private asset will be selected
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let builder = new TransactionBuilder(this.transaction);
    let assetId = this.fields['asset'].value;
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.whitelistMarket)
           .attachment('WhitelistMarket', <IHeatCreateWhitelistMarket>{
              assetId: assetId,
              currencyId: this.fields['currency'].value,
              isIssuerFeePayer: (this.isSelectedAssetPrivate(assetId) ? (this.fields['issuerFeePayer'].value ? 2 : 1) : 1)
            });
    return builder;
  }

  private getSelectedAssetInfo(assetId) {
    let assetField = <DialogFieldAsset> this.fields['asset']
    return assetField.getAssetInfo(assetId)
  }

  isSelectedAssetPrivate(assetId) {
    if (assetId == "0")
      return false;
    let assetInfo = this.getSelectedAssetInfo(assetId)
    return assetInfo && assetInfo.type == 1
  }

  isSelectedAssetExpired(assetId) {
    if (assetId == "0")
      return false;
    let assetInfo = this.getSelectedAssetInfo(assetId)
    return !!assetInfo && assetInfo.expired
  }

}
