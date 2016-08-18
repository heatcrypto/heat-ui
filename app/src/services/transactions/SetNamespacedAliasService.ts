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
@Service('setNamespacedAlias')
@Inject('$q','engine','user')
class SetNamespacedAliasService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              engine: EngineService,
              private user: UserService) {
    super('setNamespacedAlias', engine)
  }

  dialog(aliasName?: string, aliasURI?: string, $event?): IGenericDialog {
    return new SetNamespacedAliasDialog($event, this, this.$q, this.user, aliasName, aliasURI);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: any): boolean {
    if (transaction.type !== 40 || transaction.subtype !== 0) {
      return false;
    }
    var aliasLength = parseInt(<string><any>  bytes.byteArray[bytes.pos]  , 10);
    bytes.pos++;
    transaction.aliasName = converters.byteArrayToString(bytes.byteArray, bytes.pos, aliasLength);
    bytes.pos += aliasLength;
    var uriLength = converters.byteArrayToSignedShort(bytes.byteArray, bytes.pos);
    bytes.pos += 2;
    transaction.aliasURI = converters.byteArrayToString(bytes.byteArray, bytes.pos, uriLength);
    bytes.pos += uriLength;
    return transaction.aliasName === data.aliasName && transaction.aliasURI === data.aliasURI;
  }
}

class SetNamespacedAliasDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private aliasName: string,
              private aliasURI: string) {
    super($event);
    this.dialogTitle = 'Set Namespaced Alias';
    this.dialogDescription = 'Description on how to set namespaced alias';
    this.okBtnTitle = 'SEND';
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.text('aliasName', this.aliasName).
              label('Name').
              required().
              validate("Invalid character", (value) => {
                return /^[a-zA-Z0-9\!\#\$\%\&\(\)\*\+\-\.\/:;\<=\>\?\@\[\]\_\{\|\}]+$/.test(value)
              }).
              validate("Exceeds maximum length (100)", (value) => {
                return utils.getByteLen(value) <= 100;
              }),
      builder.text('aliasURI', this.aliasURI).
              label('Value').
              validate("Exceeds maximum length (1000)", (value) => {
                return utils.getByteLen(value) <= 1000;
              })
    ]
  }


  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.deadline(1440).
            feeNQT(this.transaction.engine.getBaseFeeNQT()).
            secretPhrase(this.user.secretPhrase).
            json({
              aliasName: String(this.fields['aliasName'].value).toLowerCase(),
              aliasURI: this.fields['aliasURI'].value
            });
    return builder;
  }
}
