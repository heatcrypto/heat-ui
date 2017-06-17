/// <reference path='lib/AbstractTransaction.ts'/>
/// <reference path='lib/GenericDialog.ts'/>
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
interface IHeatAssetWithdrawInfo {
  /**
   * Withdraw percentage, for instance 0.4 which means 0.4%
   */
  feePercentage: number;

  /**
   * Minimum quantity to withdraw, anything below this quantity will not be processed,
   * quantity is expressed in asset QNT (sample 0.001 BTC is 100000 qnt)
   */
  minimumQuantity: string;

  /**
   * Free form extra info to be displayed at bottom of dialog
   */
  notice1: string;
  notice2: string;
}

@Service('assetWithdraw')
@Inject('$q','user','heat')
class AssetWithdrawService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  // use promise to later support fetching from server
  getWithdrawFeeInfo(asset:string): angular.IPromise<IHeatAssetWithdrawInfo> {

    // for now this will do.
    let localCache = heat.isTestnet ? {} : {
      "5592059897546023466": { // btc
        feePercentage: 0.4,
        minimumQuantity: "150000",
        notice1: 'Bitcoin withdrawals are usually processed within 1-24 hours from requests.',
        notice2: 'Occasionally longer delays on non-banking days are possible.'
      },
      "8593933499455210945": {
        feePercentage: 0.4,
        minimumQuantity: "500000000",
        notice1: 'FIMK withdrawals are usually processed with 3-12 hours from requests.',
        notice2: 'Occasionally longer delays due to network issues are possible.'
      }
    };

    var deferred = this.$q.defer();
    if (angular.isDefined(localCache[asset]))
      deferred.resolve(localCache[asset]);
    else
      deferred.reject();
    return deferred.promise;
  }

  // the assetInfo is the $scope.currencyInfo property in the parent component
  dialog($event?, assetInfo?: AssetInfo, amount?: string): angular.IPromise<IGenericDialog> {
    var deferred = this.$q.defer();

    // you can never withdraw HEAT (which has asset id 0)
    if (assetInfo.id == "0")
      deferred.reject();

    // determine the asset issuer
    this.heat.api.getAsset(assetInfo.id, "0", 1).then((asset) => {
      let issuer = asset.account;

      // look up the issuer public key
      this.heat.api.getPublicKey(issuer).then((publicKey)=>{

        // look up the user asset balance
        this.heat.api.getAccountBalance(this.user.account, assetInfo.id).then((balance) => {

          // look up asset withdraw info
          this.getWithdrawFeeInfo(assetInfo.id).then((withdrawInfo) => {

            // create the dialog, return through promise
            deferred.resolve(new AssetWithdrawDialog($event, this, this.$q, this.user, this.heat, issuer, publicKey, assetInfo, withdrawInfo, amount, balance));

          }, deferred.reject);
        }, deferred.reject);
      }, deferred.reject);
    }, deferred.reject)

    return deferred.promise;
  }

  verify(transaction: any, bytes: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (transaction.type !== 2) return false;
    if (transaction.subtype !== 2) return false;

    transaction.assetId = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    transaction.quantity = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;

   return transaction.assetId === data.AssetTransfer.assetId &&
          transaction.quantity === data.AssetTransfer.quantity;
  }
}

class AssetWithdrawDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string,
              private assetInfo: AssetInfo,
              private withdrawInfo: IHeatAssetWithdrawInfo,
              private amount: string,
              private userBalance: IHeatAccountBalance) {
    super($event);
    this.dialogClass = "withdraw-asset-service";
    this.dialogTitle = 'Withdraw ' + this.assetInfo.symbol;
    this.dialogDescription = 'Description on how to withdraw ' + this.assetInfo.symbol;
    this.okBtnTitle = 'WITHDRAW';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
    this.amount = this.amount || '0';
  }

  /* @override */
  getFields($scope: angular.IScope) {
    let balance = utils.formatQNT(this.userBalance.balance, this.userBalance.decimals)
    let userBalanceText = `${balance} ${this.assetInfo.symbol} available on account`;
    let feeText = `Processing and network fee ${this.withdrawInfo.feePercentage.toFixed(2)}% (${this.assetInfo.symbol})`;
    let minAmountFormatted = utils.formatQNT(this.withdrawInfo.minimumQuantity, 8);
    let minWithdrawText = `Minimum withdraw amount is ${minAmountFormatted} ${this.assetInfo.symbol}`;

    var builder = new DialogFieldBuilder($scope);
    return [
      builder.staticText('balance', userBalanceText),
      builder.hidden('recipient', this.recipient)
             .required(),
      builder.text('message', '')
             .visible(true)
             .label(`Recipient ${this.assetInfo.symbol} address`),
      builder.hidden('asset', this.assetInfo.id)
             .required(),
      builder.money('amount', this.amount)
             .label('Amount')
             .required()
             .precision(this.assetInfo.decimals)
             .symbol(this.assetInfo.symbol).
              asyncValidate("Not enough funds", (amount) => {
                var deferred = this.$q.defer();
                if (this.fields['asset'].value) {
                  this.heat.api.getAccountBalance(this.user.account, this.fields['asset'].value).then(
                    (balance: IHeatAccountBalance) => {
                      try {
                        var avail = new Big(balance.unconfirmedBalance);
                        var total = new Big(amount);
                        if (avail.gte(total) > 0) {
                          deferred.resolve();
                        }
                        else {
                          deferred.reject();
                        }
                      } catch (e) {
                        deferred.reject();
                      }
                    }, deferred.reject);
                }
                else {
                  deferred.resolve();
                }
                return deferred.promise;
              }).
              validate(`Minimum amount is ${minAmountFormatted} ${this.assetInfo.symbol}`, (amount) => {
                return parseInt(amount) > parseInt(this.withdrawInfo.minimumQuantity);
              }).
              onchange(() => {
                let amountQNT = parseFloat(this.fields['amount'].value || '0');
                if (amountQNT <= 0) {
                  this.fields['youWillReceive'].value = '';
                  this.fields['totalFeeText'].value = '';
                }
                else {
                  let multiplier = 1.0 - (this.withdrawInfo.feePercentage / 100);
                  let received = Math.round(amountQNT * multiplier);
                  let totalFee = amountQNT - received;
                  this.fields['youWillReceive'].value = utils.formatQNT(received+'', 8);
                  this.fields['totalFeeText'].value = `Total fee ${utils.formatQNT(totalFee+'', 8)} ${this.assetInfo.symbol}`;
                }
              }),
      builder.hidden('recipientPublicKey', this.recipientPublicKey),
      builder.staticText('feeText', feeText),
      builder.text('youWillReceive', '0')
             .label('You will receive')
             .readonly(true),
      builder.staticText('totalFeeText', ''),
      builder.staticText('minWithdrawText', minWithdrawText),
      builder.staticText('withdrawalNotice1', this.withdrawInfo.notice1),
      builder.staticText('withdrawalNotice2', this.withdrawInfo.notice2)
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.standard)
           .attachment('AssetTransfer', <IHeatCreateAssetTransfer>{
              assetId: this.fields['asset'].value,
              quantity: this.fields['amount'].value
            });
    builder.recipient(this.fields['recipient'].value);
    builder.recipientPublicKey(this.fields['recipientPublicKey'].value);
    if (this.fields['message'].value) {
      builder.message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    }
    return builder;
  }
}
