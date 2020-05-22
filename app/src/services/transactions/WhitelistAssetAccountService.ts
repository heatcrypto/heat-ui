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
@Service('whitelistAssetAccount')
@Inject('$q', 'user', 'heat')
class WhitelistAssetAccountService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new WhitelistAssetAccountDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type != 2 || transaction.subtype != 7) return false;

    transaction.assetId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.accountId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.endHeight = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;

    return transaction.assetId === data.WhitelistAssetAccount.assetId
      && transaction.accountId === data.WhitelistAssetAccount.accountId
      && transaction.endHeight === data.WhitelistAssetAccount.endHeight;
  }
}

class WhitelistAssetAccountDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string) {
    super($event);
    this.dialogTitle = 'Whitelist account to use the private asset';
    this.dialogDescription = 'Description on how to whitelist account to use the private asset';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.whitelistAssetAccount, 8).replace(/000000$/, '');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder
        .staticText('feeNote', "Enabling account for private asset the fee: "
          + utils.formatQNT(HeatAPI.fee.whitelistAssetAccount, 8).replace(/000000$/, '')
          + ". Disabling account for private asset the fee: "
          + utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/, '')
        ),
      builder.asset('asset')
        .label('Your private asset')
        .validate("You dont own this asset", (value) => {
          if (value == "0") return true;
          let assetField = <DialogFieldAsset>this.fields['asset'];
          let assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
          return !!assetInfo;
        }).required(),
      builder
        .account('account')
        .label('Account to be enabled to use the private asset')
        .required(),
      builder.text('endHeight')
        .label('End height (set 0 to disable the account for private asset)')
        .required(),
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let endHeight = parseInt(this.fields['endHeight'].value);
    let fee = endHeight == 0 ? HeatAPI.fee.standard : HeatAPI.fee.whitelistAssetAccount
    let builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .feeNQT(fee)
      .attachment('WhitelistAssetAccount', <IHeatCreateWhitelistAssetAccount>{
        assetId: this.fields['asset'].value,
        accountId: this.fields['account'].value,
        endHeight: endHeight
      });
    return builder;
  }


}
