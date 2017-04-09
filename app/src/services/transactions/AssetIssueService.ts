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
@Service('assetIssue')
@Inject('$q','user','assetInfo','heat')
class AssetIssueService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private assetInfo: AssetInfoService,
              private heat: HeatService) {
    super();
  }

  dialog(currency: string, readonly?: boolean, $event?): IGenericDialog {
    return new AssetIssueDialog($event, this, this.$q, this.user, this.assetInfo, this.heat, readonly);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 0) return false;

    var descriptionUrlLen = bytes.byteArray[bytes.pos]
    bytes.pos += 1;

    transaction.descriptionUrl = converters.byteArrayToString(bytes.byteArray, bytes.pos, descriptionUrlLen);
    bytes.pos += descriptionUrlLen;

    transaction.descriptionHash = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + 32));
    bytes.pos += 32;

    transaction.quantity = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;

    transaction.decimals = bytes.byteArray[bytes.pos];
    bytes.pos += 1;

    transaction.dillutable = bytes.byteArray[bytes.pos] == 1;
    bytes.pos += 1;

    return transaction.descriptionUrl === data.AssetIssuance.descriptionUrl &&
           transaction.descriptionHash === data.AssetIssuance.descriptionHash &&
           transaction.quantity === data.AssetIssuance.quantityQNT &&
           transaction.decimals === data.AssetIssuance.decimals &&
           transaction.dillutable === data.AssetIssuance.dillutable;
  }
}

class AssetIssueDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private assetInfo: AssetInfoService,
              private heat: HeatService,
              private readonly: boolean) {
    super($event);
    this.dialogTitle = 'Issue asset';
    this.dialogDescription = 'Description on how to issue an asset';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.assetIssue, 8).replace(/000000$/,'');
    this.okBtnTitle = 'SEND';
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.text('symbol').
              label('Asset symbol (3-4 chars)').
              validate("Symbol must have 3 to 4 chars", (symbol:string) => {
                var len = angular.isString(symbol) ? symbol.trim().length : 0;
                return  len >= 3 && len <= 4;
              }).
              asyncValidate("Symbol name already in use",(symbol)=> {
                var deferred = this.$q.defer();
                this.heat.api.getAssetProtocol1(symbol).then((asset) => {
                  deferred.reject();
                }, (response) => {
                  if (response && response.code == 3 && response.description == "Unknown asset")
                    deferred.resolve();
                  else
                    deferred.reject();
                });
                return deferred.promise;
              }).
              required(),
      builder.text('name').
              label('Asset name').
              validate("Name can be at most 100 characters long", (name:string) => {
                var len = angular.isString(name) ? name.trim().length : 0;
                return  len <= 100;
              }).
              required(),
      builder.text('quantity').
              label('Quantity').
              required(),
      builder.text('decimals').
              label('Decimals').
              required().
              validate("Allowed range 0 .. 8", (decimals) => {
                var num = parseInt(decimals);
                if (isNaN(num))
                  return false;
                return num >= 0 && num <= 8;
              }),
      builder.text('dillutable', 'false').
              label('Dillutable').
              required().
              validate("Either type true or false", (dillutable) => {
                return dillutable == 'true' || dillutable == 'false';
              }),
      builder.text('descriptionUrl', 'http://').
              label('Description URL (http:// or https://) (can be changed later)').
              validate("Either leave blank or has to start with http:// or https://", (value) => {
                return !value || value.indexOf('http://') == 0 || value.indexOf('https://') == 0;
              }).
              required(false),
      builder.text('descriptionHash').
              label('Description hash (SHA256) of the description url contents (can be changed later)').
              validate("Either leave blank or provide SHA256 hash in hex encoding", (value) => {
                if (value) {
                  if (!/[0-9A-Fa-f]{6}/g.test(value))
                    return false;
                  var bytes = converters.hexStringToByteArray(value);
                  if (bytes.length != 32)
                    return false;
                }
                return true;
              }).
              required(false),
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.assetIssue)
           .attachment('AssetIssuance', <IHeatCreateAssetIssuance> {
              decimals: parseInt(this.fields['decimals'].value),
              dillutable: this.fields['dillutable'].value == 'true',
              quantityQNT: utils.convertToQNT(this.fields['quantity'].value),
              descriptionHash: this.fields['descriptionHash'].value || "0".repeat(64),
              descriptionUrl: this.fields['descriptionUrl'].value || 'http://'
            });

    // generate a protocol 1 asset properties description
    var properties =  this.assetInfo.stringifyProperties(<AssetPropertiesProtocol1>{
      symbol: this.fields['symbol'].value,
      name: this.fields['name'].value
    });

    // create a asset properties bundle, pass asset=0 to have the bundle replicator
    // take the asset id from the current transaction (since the asset does not exist yet)
    var messageHex = heat.bundle.createAssetProperties({
      asset: "0",
      protocol: 1,
      value: properties
    });

    // bundle messages are public and binary
    builder.message(messageHex, TransactionMessageType.PUBLIC, true);
    return builder;
  }
}
