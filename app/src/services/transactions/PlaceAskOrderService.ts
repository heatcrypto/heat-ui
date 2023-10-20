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
@Service('placeAskOrder')
@Inject('$q','user')
class PlaceAskOrderService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService) {
    super();
  }

  dialog(market: IHeatMarket, currencyInfo: AssetInfo, assetInfo: AssetInfo, price?: string, quantity?: string, expiration?: number,
         readonly?: boolean, $event?): IGenericDialog {
    return new PlaceAskOrderDialog($event, this, this.$q, this.user,
      market, currencyInfo, assetInfo, price, quantity, expiration, readonly);
  }

  verify(transaction: any, attachment: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 3) return false;

    transaction.currency = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.asset = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.quantity = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.price = String(converters.byteArrayToBigInteger(attachment.byteArray, attachment.pos));
    attachment.pos += 8;
    transaction.expiration = converters.byteArrayToSignedInt32(attachment.byteArray, attachment.pos);
    attachment.pos += 4;

    let result = transaction.currency === data.AskOrderPlacement.currencyId &&
      transaction.asset === data.AskOrderPlacement.assetId &&
      transaction.quantity === data.AskOrderPlacement.quantity &&
      transaction.price === data.AskOrderPlacement.price &&
      transaction.expiration === data.AskOrderPlacement.expiration;

    if (attachment.attachmentVersion > 1) {
      transaction.isSenderFeePayer = attachment.byteArray[attachment.pos] == 1;
      attachment.pos += 1;
      result = result && transaction.isSenderFeePayer === data.AskOrderPlacement.isSenderFeePayer;
    }

    return result
  }
}

class PlaceAskOrderDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private market: IHeatMarket,
              private currencyInfo: AssetInfo,
              private assetInfo: AssetInfo,
              private price: string,
              private quantity: string,
              private expiration: number,
              private readonly: boolean) {
    super($event);
    this.dialogTitle = 'Place ask order';
    this.dialogDescription = 'Description on how to place ask order';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.text('currency', this.currencyInfo.id).
              label('Currency').
              required().
              readonly(this.readonly),
      builder.text('asset', this.assetInfo.id).
              label('Asset').
              required().
              readonly(this.readonly),
      builder.text('price', this.price).
              label('Price').
              required().
              readonly(this.readonly),
      builder.text('quantity', this.quantity).
              label('Amount').
              required().
              readonly(this.readonly),
      builder.text('expiration', this.expiration).
              label('Expiration').
              required().
              readonly(this.readonly),
      builder.switcher("isSenderFeePayer", true)
        .label('Force sender pays network fee')
        .visible(this.market?.isIssuerFeePayer && (this.assetInfo.type == 1 || this.currencyInfo.type == 1))
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.standard)
           .attachment('AskOrderPlacement', <IHeatCreateAskOrderPlacement>{
              currencyId: this.fields['currency'].value,
              assetId: this.fields['asset'].value,
              price: utils.convertToQNT(this.fields['price'].value, this.currencyInfo.decimals),
              quantity: utils.convertToQNT(this.fields['quantity'].value, this.assetInfo.decimals),
              expiration: this.fields['expiration'].value,
              isSenderFeePayer: !!this.fields['isSenderFeePayer'].value
           });
    return builder;
  }
}
