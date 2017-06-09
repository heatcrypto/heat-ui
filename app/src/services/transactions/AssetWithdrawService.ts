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
// @Service('withdrawAsset')
// class WithdrawAssetService extends AssetTransferService {
//   dialog($event?, recipient?: string, recipientPublicKey?, asset?: string, amount?: string, userMessage?: string, currencyInfo: AssetInfo): IGenericDialog {
//     return new WithdrawAssetDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey, asset, amount, userMessage);
//   }
// }
// class WithdrawAssetDialog extends AssetTransferDialog {
//   currencyInfo: any;
//   constructor($event,
//               public transaction: AbstractTransaction,
//               public $q: angular.IQService,
//               public user: UserService,
//               public heatService: HeatService,
//               public recipient: string,
//               public recipientPublicKey: string,
//               public asset: string,
//               public amount: string,
//               public userMessage: string) {
//     super($event, transaction, $q, user, heatService, recipient, recipientPublicKey, asset, amount, userMessage);
//     this.dialogClass = "withdraw-asset-service";
//     this.dialogTitle = 'Withdraw ' + this.currencyInfo.symbol;
//     this.dialogDescription = 'Description on how to withdraw ' + this.currencyInfo.symbol;
//     this.okBtnTitle = 'WITHDRAW';
//   }
//
//   /* @override */
//   getFields($scope: angular.IScope) {
//     // this.heat.api.getAccountBalance(this.user.account, this.currencyInfo.id).then(
//     //   (balance: IHeatAccountBalance) => {
//     //     this.fields['balance'].value = this.currencyInfo.symbol +
//     //       ' balance available on #' + this.user.account + ': ' +
//     //       utils.formatQNT(balance.balance, balance.decimals) + ' ' +
//     //       this.currencyInfo.symbol;
//     //   })
//     var builder = new DialogFieldBuilder($scope);
//     return [
//       builder.staticText('balance', ''),
//       builder.account('message', null).
//               label('Recipient Bitcoin address').
//               required(),
//       builder.money('amount', 0).
//               label('Amount').
//               required().
//               precision(8).
//               symbol(this.asset).
//               asyncValidate("Not enough funds", (amount) => {
//                 var deferred = this.$q.defer();
//                 this.heatService.api.getAccountBalance(this.user.account, '0').then(
//                   (balance: IHeatAccountBalance) => {
//                     try {
//                       var avail = new Big(balance.unconfirmedBalance);
//                       var total = new Big(amount).add(new Big(HeatAPI.fee.standard));
//                       if (avail.gte(total) > 0) {
//                         deferred.resolve();
//                       }
//                       else {
//                         deferred.reject();
//                       }
//                     } catch (e) {
//                       deferred.reject();
//                     }
//                   }, deferred.reject);
//                 return deferred.promise;
//               }).
//               onchange(() => {
//                 this.fields['youWillReceive'].value = parseFloat(this.fields['amount'].value) * 0.996;
//               }),
//         builder.staticText('feeText', 'Processing and network fee 0.40% (' + this.currencyInfo.symbol + ')'),
//         builder.money('youWillReceive', 0).
//                 label('You will receive').
//                 precision(8).
//                 symbol(this.asset),
//       builder.staticText('withdrawalNotice1', this.currencyInfo.symbol + ' withdrawals are usually \
//         processed within 1-24 hours from requests.'),
//       builder.staticText('withdrawalNotice2', 'Occasionally longer delays on \
//         non-banking days are possible.'),
//       builder.hidden('asset', this.asset)
//     ]
//   }
// }

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
@Service('assetWithdraw')
@Inject('$q','user','heat')
class AssetWithdrawService extends AbstractTransaction {

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService) {
    super();
  }

  // the assetInfo is the $scope.currencyInfo property in the parent component
  dialog($event?, recipient?: string, recipientPublicKey?, assetInfo?: AssetInfo, amount?: string, userMessage?: string): IGenericDialog {
    return new SampleWithdrawDialog($event, this, this.$q, this.user, this.heat, recipient, recipientPublicKey, assetInfo, amount, userMessage);
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

class SampleWithdrawDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private recipient: string,
              private recipientPublicKey: string,
              private assetInfo: AssetInfo,
              private amount: string,
              private userMessage: string) {
    super($event);
    this.dialogClass = "withdraw-asset-service";
    this.dialogTitle = 'Withdraw ' + this.assetInfo.symbol;
    this.dialogDescription = 'Description on how to withdraw ' + this.assetInfo.symbol;
    this.okBtnTitle = 'WITHDRAW';
    this.feeFormatted = utils.formatQNT(HeatAPI.fee.standard, 8).replace(/000000$/,'');
    this.recipient = this.recipient || '';
    this.assetInfo = this.assetInfo || null;
    this.amount = this.amount || '0';
    this.recipientPublicKey = this.recipientPublicKey || null;
  }

  /* @override */
  getFields($scope: angular.IScope) {
    this.heat.api.getAccountBalance(this.user.account, this.assetInfo.id).then(
      (balance: IHeatAccountBalance) => {
        this.fields['balance'].value = this.assetInfo.symbol +
          ' balance available on #' + this.user.account + ': ' +
          utils.formatQNT(balance.balance, balance.decimals) + ' ' +
          this.assetInfo.symbol;
      })
    var builder = new DialogFieldBuilder($scope);
    return [
      builder.staticText('balance', ''),
      builder.hidden('recipient', this.recipient).required(),
      // the btc address where we want to receive our bitcoins is gonna be send as an encrypted message.
      // what we change is the label of the field only.
      builder.text('message', this.userMessage).
        rows(1).
        visible(true).
        asyncValidate("No recipient public key", (message) => {
          var deferred = this.$q.defer();
          if (String(message).trim().length == 0) {
            deferred.resolve();
          }
          else {
            if (this.fields['recipientPublicKey'].value) {
              deferred.resolve();
            }
            else {
              this.heat.api.getPublicKey(this.fields['recipient'].value).then(
                (publicKey) => {
                  this.fields['recipientPublicKey'].value = publicKey;
                  deferred.resolve();
                },
                deferred.reject
              );
            }
          }
          return deferred.promise;
        }).
        label("Recipient Bitcoin address"),
      builder.hidden('asset', this.assetInfo.id).required(),

      // the amount plus handling can stay as is (mostly, added precission and symbol)
      builder.money('amount', this.amount).
              label('Amount').
              required().
              precision(this.assetInfo.decimals).
              symbol(this.assetInfo.symbol).
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
              onchange(() => {
                console.log('************************')
                console.log('youWillReceive', this.fields['youWillReceive'].value)
                console.log('amount', this.fields['amount'].value)
                console.log('------------------------')
                //this.fields['youWillReceive'].value = parseFloat(this.fields['amount'].value) * 0.996;
                if (this.fields['amount'].value !== undefined) {
                  this.fields['youWillReceive'].value = (this.fields['amount'].value * 0.996) + ''
                }
                console.log('youWillReceive', this.fields['youWillReceive'].value)
                console.log('amount', this.fields['amount'].value)
              }),
      builder.hidden('recipientPublicKey', this.recipientPublicKey),

      // add the fields to show static text and the dynamic fee field
      // the youWillReceive field is probably better done with a text field which is set to
      // readonly and is updated from the amount onchange method
      builder.staticText('feeText', 'Processing and network fee 0.40% (' + this.assetInfo.symbol + ')'),
      builder.money('youWillReceive', undefined).
                label('You will receive').
                precision(this.assetInfo.decimals).
                symbol(this.assetInfo.symbol),
      builder.staticText('withdrawalNotice1', this.assetInfo.symbol + ' withdrawals are usually \
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
           .attachment('AssetTransfer', <IHeatCreateAssetTransfer>{
              assetId: this.fields['asset'].value,
              quantity: this.fields['amount'].value
            });
    builder.recipient(this.fields['recipient'].value);
    builder.recipientPublicKey(this.fields['recipientPublicKey'].value);
    if (this.fields['message'].value) {
      builder.message(this.fields['message'].value, TransactionMessageType.TO_RECIPIENT);
    }
    // if (angular.isDefined(this.bundle)) {
    //   builder.bundle(this.bundle);
    // }
    return builder;
  }
}
