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
@Service('placeAskOrder')
@Inject('$q','engine','user')
class PlaceAskOrderService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              engine: EngineService,
              private user: UserService) {
    super('placeAskOrder', engine)
  }

  dialog(asset: IAsset, price?: string, quantity?: string, readonly?: boolean, $event?): IGenericDialog {
    return new PlaceAskOrderDialog($event, this, this.$q, this.user, asset, price, quantity, readonly);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: any): boolean {
    if (transaction.type !== 2) return false;
    else if (this.requestType == "placeAskOrder" && transaction.subtype !== 2) return false;
    else if (this.requestType == "placeBidOrder" && transaction.subtype !== 3) return false;
    transaction.asset = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.quantityQNT = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.priceNQT = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;

    return transaction.asset === data.asset &&
           transaction.quantityQNT === data.quantityQNT &&
           transaction.priceNQT === data.priceNQT;
  }
}

class PlaceAskOrderDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private asset: IAsset,
              private price: string,
              private quantity: string,
              private readonly: boolean) {
    super($event);
    this.dialogTitle = 'Place ask order';
    this.dialogDescription = 'Description on how to place ask order';
    this.okBtnTitle = 'SEND';
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.text('asset', this.asset.asset).
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
              readonly(this.readonly)
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.deadline(1440).
            feeNQT(this.transaction.engine.getBaseFeeNQT()).
            secretPhrase(this.user.secretPhrase).
            json({
              priceNQT: utils.calculatePricePerWholeQNT(utils.convertToNQT(this.fields['price'].value), this.asset.decimals),
              asset: this.fields['asset'].value,
              quantityQNT: utils.convertToQNT(this.fields['quantity'].value, this.asset.decimals)
            });
    return builder;
  }
}
