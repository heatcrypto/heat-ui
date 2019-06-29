///<reference path='lib/AbstractTransaction.ts'/>
///<reference path='lib/GenericDialog.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2019 Heat Ledger Ltd.
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

@Service('masternode')
@Inject('$q', 'user')
class MasternodeService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?): IGenericDialog {
    return new RegisterInternetAddressDialog($event, this, this.$q, this.user, this.heat, "");
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (!AbstractTransaction.checkType(transaction, 4, 1)) return false;

    let len = bytes.byteArray[bytes.pos];
    bytes.pos += 1;

    transaction.internetAddress = converters.byteArrayToString(bytes.byteArray, bytes.pos, len);
    bytes.pos += len;

    return transaction.internetAddress === data.InternetAddress.internetAddress;
  }
}

class RegisterInternetAddressDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private internetAddress: string) {
    super($event);
    this.dialogTitle = 'Register Internet Address';
    this.dialogDescription = 'Register Internet Address to be Masternode';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.registerInternetAddressFee, 8).replace(/000000$/, '');
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder
        .text('internetAddress', this.internetAddress)
        .label('Internet Address (domain name)')
        .required()
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .recipient(this.user.account)
      .feeNQT(HeatAPI.fee.registerInternetAddressFee)
      .attachment('InternetAddress', <IHeatRegisterInternetAddress>{
        internetAddress: this.fields['internetAddress'].value
      });
    return builder;
  }

}
