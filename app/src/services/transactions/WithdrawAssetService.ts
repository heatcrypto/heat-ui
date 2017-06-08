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
@Service('withdrawAsset')
@Inject('$q','user','heat')
class WithdrawAssetService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  dialog($event?, currencyInfo?: AssetInfo): IGenericDialog {
    return new WithdrawAssetDialog($event, this, this.$q, this.user, this.heat, currencyInfo);
  }

  verify(transaction: any, bytes: IByteArrayWithPosition): boolean {
    return transaction.type === 0 && transaction.subtype === 0;
  }
}

class WithdrawAssetDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private currencyInfo: AssetInfo) {
    super($event);
    this.dialogClass = "withdraw-asset-service"
    this.currencyInfo = currencyInfo
    this.dialogTitle = 'Withdraw ' + this.currencyInfo.symbol;
    this.dialogDescription = 'Description on how to withdraw ' + this.currencyInfo.symbol;
    this.okBtnTitle = 'WITHDRAW';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
  }

  /* @override */
  getFields($scope: angular.IScope) {
    this.heat.api.getAccountBalance(this.user.account, this.currencyInfo.id).then(
      (balance: IHeatAccountBalance) => {
        this.fields['balance'].value = this.currencyInfo.symbol +
          ' balance available on #' + this.user.account + ': ' +
          utils.formatQNT(balance.balance, balance.decimals) + ' ' +
          this.currencyInfo.symbol;
      })
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.staticText('balance', ''),
      builder.account('recipient', null).
              label('Recipient Bitcoin address').
              required(),
      builder.money('amount', 0).
              label('Amount').
              required().
              precision(8).
              symbol(this.currencyInfo.symbol).
              asyncValidate("Not enough funds", (amount) => {
                var deferred = this.$q.defer();
                this.heat.api.getAccountBalance(this.user.account, '0').then(
                  (balance: IHeatAccountBalance) => {
                    try {
                      var avail = new Big(balance.unconfirmedBalance);
                      var total = new Big(amount).add(new Big(HeatAPI.fee.standard));
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
                return deferred.promise;
              }).
              onchange(() => {
                this.fields['youWillReceive'].value = parseFloat(this.fields['amount'].value) * 0.996;
              }),
        builder.staticText('feeText', 'Processing and network fee 0.40% (' + this.currencyInfo.symbol + ')'),
        builder.money('youWillReceive', 0).
                label('You will receive').
                precision(8).
                symbol(this.currencyInfo.symbol),
      builder.staticText('withdrawalNotice1', this.currencyInfo.symbol + ' withdrawals are usually \
        processed within 1-24 hours from requests.'),
      builder.staticText('withdrawalNotice2', 'Occasionally longer delays on \
        non-banking days are possible.')
    ]
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
           .feeNQT(HeatAPI.fee.standard)
           .attachment('OrdinaryPayment', <IHeatCreateOrdinaryPayment>{
              amountHQT: this.fields['amount'].value
            });
    builder.recipient(this.fields['recipient'].value);
    builder.recipientPublicKey(this.fields['recipientPublicKey'].value);
    return builder;
  }
}
