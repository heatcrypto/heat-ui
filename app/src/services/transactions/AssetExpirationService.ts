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
@Service('assetExpiration')
@Inject('$q','user','heat','$interval')
class AssetExpirationService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private $interval: angular.IIntervalService) {
    super();
  }

  dialog($event?, recipient?: string, recipientPublicKey?): IGenericDialog {
    return new AssetExpirationDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey, this.$interval);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 12) return false;

    transaction.assetId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.expiration = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;

   return transaction.expiration === data.AssetExpiration.expiration &&
          transaction.assetId === data.AssetExpiration.assetId;
  }
}

class AssetExpirationDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string,
              private $interval: angular.IIntervalService) {
    super($event);
    this.dialogTitle = 'Assign asset expiration';
    this.dialogDescription = 'Description on how to assign asset expiration';
    this.okBtnTitle = 'SEND';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.assetAssignExpiration, 8).replace(/000000$/,'');
    this.recipient = this.recipient || '';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    let builder = new DialogFieldBuilder($scope);
    return [
      builder.asset('asset')
        .label('Your asset')
        .validate("You dont own this asset", (value) => {
                if (value == "0")
                  return true;
                var assetField = <DialogFieldAsset> this.fields['asset'];
                var assetInfo = assetField.getAssetInfo(this.fields['asset'].value);
                return !!assetInfo;
              }).
              required(),
      builder.text('expiration', 0)
        .label('Expiration timestamp (after timestamp the trading of asset will be disabled)'),
      builder.staticText("expirationDate", ''),
      builder.staticText("systemtimestamp", '')
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    let builder = new TransactionBuilder(this.transaction);
    let assetId = this.fields['asset'].value;
    builder.secretPhrase(this.user.secretPhrase)
      .feeNQT(HeatAPI.fee.assetAssignExpiration)
      .attachment('AssetExpiration', <IHeatCreateAssetExpiration>{
        assetId: assetId,
        expiration: parseInt(this.fields['expiration'].value || '0')
      });
    return builder;
  }

  fieldsReady($scope: angular.IScope) {
    let interval = this.$interval(() => {
      $scope.$evalAsync(() => {
        let expirationValue = parseInt(this.fields['expiration'].value || '0')
        this.fields['expirationDate'].value = expirationValue > 0
          ? 'Entered expiration value date: ' + utils.timestampToDate(expirationValue)
          : ''
        this.fields['systemtimestamp'].value = "Current timestamp: " + Math.round(utils.epochTime())
      });
    }, 1000, 0, false);
    $scope.$on('$destroy', () => { this.$interval.cancel(interval) });
  }

}
