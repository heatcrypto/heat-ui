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

@Service('masternode')
@Inject('$q', 'user', 'heat')
class MasternodeService extends AbstractTransaction {

  fee: string

  constructor(private $q: angular.IQService,
              private user: UserService,
              private heatService: HeatService) {
    super();
    this.fee = HeatAPI.fee.registerInternetAddressFee
    if (!heat.isTestnet) {
      this.heatService.api.getBlockchainStatus().then(status => {
        //fork 4.0.0
        this.fee = status?.lastBlockchainFeederHeight < 4372000 ? utils.convertToQNT('100.00') : HeatAPI.fee.registerInternetAddressFee
      })
    }
  }

  dialog($event?): IGenericDialog {
    return new RegisterInternetAddressDialog($event, this, this.$q, this.user, this.heatService, "", this.fee);
  }

  verify(transaction: any, attachment: IByteArrayWithPosition, data: IHeatCreateTransactionInput): boolean {
    if (!AbstractTransaction.checkType(transaction, 4, 1)) return false;

    let len = attachment.byteArray[attachment.pos];
    attachment.pos += 1;

    transaction.internetAddress = converters.byteArrayToString(attachment.byteArray, attachment.pos, len);
    attachment.pos += len;

    return transaction.internetAddress === data.InternetAddress.internetAddress;
  }
}

class RegisterInternetAddressDialog extends GenericDialog {

  constructor($event,
              private transaction: AbstractTransaction,
              private $q: angular.IQService,
              private user: UserService,
              private heat: HeatService,
              private internetAddress: string,
              private fee: string) {
    super($event);
    this.dialogTitle = 'Register Masternode Address';
    this.dialogDescription = 'Register Internet Address to be Masternode';
    this.okBtnTitle = 'SEND';

    this.feeFormatted = utils.formatQNT(this.fee, 8).replace(/000000$/, '');
  }

  /* @override */
  getFields($scope: angular.IScope) {
    let builder = new DialogFieldBuilder($scope);
    return [
      builder
        .text('internetAddress', this.internetAddress)
        .label('IP address or domain name')
        .required(),
      builder.staticText('note2', "Minimum stake for Masternode to receive POP reward at block generation is 1000 HEAT"),
      builder.staticText('feeText', "NOTICE: Masternode registration will expire after 311040  blocks (~90 days). To keep receiving POP rewards you will need to re-register at that time"),
      builder.staticText('masternodesList', "")
        .label("List of actual masternodes (account, IP or domain name, expiration height)")
        .scrollable(true)
    ]
  }

  fieldsReady($scope: angular.IScope) {
    this.heat.api.listMasternodes().then(masternodes => {
      let masterNodesStr = masternodes.map(v => `${v.account}   ${v.internetAddress}   ${v.expirationHeight || ""}`).join("\n")
      $scope.$evalAsync(() => this.fields['masternodesList'].value = masterNodesStr)
    })
  }

  /* @override */
  getTransactionBuilder(): TransactionBuilder {
    var builder = new TransactionBuilder(this.transaction);
    builder.secretPhrase(this.user.secretPhrase)
      .recipient(this.user.account)
      .feeNQT(this.fee)
      .attachment('InternetAddress', <IHeatRegisterInternetAddress>{
        internetAddress: this.fields['internetAddress'].value
      });
    return builder;
  }

}
