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

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 9) return false;

    transaction.currencyId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.assetId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;

   return transaction.currencyId === data.WhitelistMarket.currencyId &&
          transaction.assetId === data.WhitelistMarket.assetId;
  }
}

class WhitelistMarketferDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = 'Whitelist Market';
    this.dialogDescription = 'Description on how to whitelist a market';
    this.okBtnTitle = 'SEND';

    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.asset('asset').
              label('Your asset').
              validate("You dont own this asset", (value) => {
                if (value == "0")
                  return true;
                var assetField = <DialogFieldAsset> this.fields['asset'];
                var assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
                return !!assetInfo;
              }).
              required(),
      builder.asset('currency').
              label('Allow market').
              searchAllAssets(true).
              required(),
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.assetIssue)
           .attachment('WhitelistMarket', <IHeatCreateWhitelistMarket>{
              assetId: this.fields['asset'].value,
              currencyId: this.fields['currency'].value
            });
    return builder;
  }


}
