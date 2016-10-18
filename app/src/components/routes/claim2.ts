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
declare var saveAs: any;
@RouteConfig('/claim2/:currency/:address')
@Component({
  selector: 'claim2',
  inputs: ['currency','address'],
  styles: [`
    claim2 .emphazised {
      font-weight: bold;
    }
    claim2 .verification-payment-details td:first-child {
      padding-right: 32px;
    }
    claim2 md-input-container .md-errors-spacer {
      display:none;
    }
  `],
  template: `
    <div layout="column" flex layout-padding>
      <span class="md-display-1">Claim HEAT ICO Tokens</span>
      <div layout="column"  ng-if="vm.status.status == 0"><!-- ClaimStatus.CHALLENGE_NOT_CREATED -->
        <p class="emphazised">Your HEAT genesis account will be *this* account you are now logged into.<br>
        Please make sure you use a confidential passphrase.<br>If you wish to use a different account, please create a new account and start
        the verification process from there.</p>
        <p>We advise you print or write down your HEAT genesis passprase, if lost you will lose access to your HEAT.<br>
        Please pick one or more methods to back up your passphrase listed below.</p>
        <br>
        <div layout="row">
          <md-button ng-click="vm.printPassphrase()">
            <md-icon md-font-library="material-icons">print</md-icon>
            &nbsp;&nbsp;Print
          </md-button>
          <md-button ng-click="vm.savePassphrase()" ng-if="vm.isFileSaverSupported">
            <md-icon md-font-library="material-icons">save</md-icon>
            &nbsp;&nbsp;Save
          </md-button>
          <md-button ng-click="vm.copyPassphrase()">
            <md-icon md-font-library="material-icons">content_copy</md-icon>
            &nbsp;&nbsp;Copy
          </md-button>
          <md-button ng-click="vm.revealPassphrase()">
            <md-icon md-font-library="material-icons">arrow_drop_down_circle</md-icon>
            &nbsp;&nbsp;{{vm.showPassphrase?'Hide':'Reveal'}}
          </md-button>
        </div>
        <div ng-show="vm.showPassphrase">
          <p>Passphrase for {{ vm.user.account }}:</p>
          <p><code id="claim2-passphrase">{{vm.user.secretPhrase}}</code></p>
        </div>
        <p><md-checkbox ng-model="vm.passphraseBackedUp" aria-label="I have backed up my passphrase">
            I have safely backed up my passphrase
          </md-checkbox></p>
        <div layout="column" layout-align-gt-sm="start start">
          <md-button class="md-raised md-primary" ng-click="vm.getStatus($event)" ng-disabled="!vm.passphraseBackedUp">Continue</md-button>
        </div>
      </div>
      <div layout="column"  ng-if="vm.status.status == 1"><!-- ClaimStatus.CHALLENGE_NOT_CREATED -->
        <p>We're going to transfer a small amount of {{vm.currencyLong}} to your HEAT ICO participating BTC address [<code>{{vm.address}}</code>].<br>
        You will need access to your {{vm.currency}} address to complete verification.</p>
        <p>If you don't have access to your {{vm.currency}} address, please contact <a href="mailto:info@heatledger.com">info@heatledger.com</a> and describe your situation.</p>
        <div layout="column" layout-align-gt-sm="start start">
          <md-button class="md-raised md-primary" ng-click="vm.createChallenge($event)" ng-disabled="vm.loading">
            Continue
          </md-button>
        </div>
        <md-progress-linear ng-show="vm.loading" class="md-primary" md-mode="indeterminate"></md-progress-linear>
      </div>
      <div layout="column" ng-if="vm.status.status == 2"><!-- ClaimStatus.CHALLENGE_NOT_CONFIRMED -->
        <p>Your address has been transfered an amount of {{vm.verificationAmount}} {{vm.currencyLong}} (either just now or some time in the past) this includes the costs to cover your transfer fee.<br>
        To confirm ownership of the ICO participant {{vm.currencyLong}} account transfer the amount listed below to the confirmation address also listed below.</p>
        <p>The verification payment <u>has to be send from your ICO address</u>, if you are unable to send payments from your ICO address please contact <a href="mailto:info@heatledger.com">info@heatledger.com</a> and describe your situation.</p>
        <p><span class="md-title">Verification payment</span>&nbsp;(which you have to make)</p>
        <table class="verification-payment-details">
          <tr><td>Sender (you)</td><td>{{vm.status.address}}</td></tr>
          <tr><td>Recipient (us)</td><td class="emphazised">{{vm.status.confirmationAddress}}</td></tr>
          <tr><td>Amount</td><td class="emphazised">{{vm.returnAmount}} {{vm.currency}}</td></tr>
          <tr><td>Received</td><td>Not yet<span ng-show="vm.nextCheckInSeconds > 0">&nbsp;(next check in {{vm.nextCheckInSeconds}} seconds)</span></td></tr>
        </table>
        <p>Click the button below <b>after</b> you have transferred <b><u>{{vm.returnAmount}} {{vm.currency}}</u></b> from {{vm.status.address}} to <b>{{vm.status.confirmationAddress}}</b>.</p>
        <div layout="column" layout-align-gt-sm="start start">
          <md-button class="md-raised md-primary" ng-click="vm.verifyTransfer($event)" ng-disabled="vm.nextCheckInSeconds > 0">
            Verify my {{vm.currency}} transfer
          </md-button>
        </div>
      </div>
      <div layout="column" ng-if="vm.status.status == 3"><!-- ClaimStatus.CHALLENGE_VERIFIED -->
        <p>You have succesfully verified <b>{{vm.currencyLong}} address {{vm.address}}</b> to belong to you.<br>
        Your HEAT account {{vm.user.account}} will receive your allocated number of HEAT tokens from the genesis block.</p>
        <p>These adresses are now confirmed to belong to you.</p>
        <table class="verification-payment-details">
          <tr ng-repeat="verification in vm.verifications">
            <td>{{verification.currencyLong}}</td><td><a href="{{verification.href}}" target="_blank">{{verification.address}}</a></td>
          </tr>
        </table>
        <p><span class="md-title">Backup your passphrase!</span></p>
        <p>If you have not backed up your passphrase, now is the time to do so.<br>
        Choose one of the options below to backup your passphrase</p>
        <div layout="row">
          <md-button ng-click="vm.printPassphrase()">
            <md-icon md-font-library="material-icons">print</md-icon>
            &nbsp;&nbsp;Print
          </md-button>
          <md-button ng-click="vm.savePassphrase()" ng-if="vm.isFileSaverSupported">
            <md-icon md-font-library="material-icons">save</md-icon>
            &nbsp;&nbsp;Save
          </md-button>
          <md-button ng-click="vm.copyPassphrase()">
            <md-icon md-font-library="material-icons">content_copy</md-icon>
            &nbsp;&nbsp;Copy
          </md-button>
          <md-button ng-click="vm.revealPassphrase()">
            <md-icon md-font-library="material-icons">arrow_drop_down_circle</md-icon>
            &nbsp;&nbsp;{{vm.showPassphrase?'Hide':'Reveal'}}
          </md-button>
        </div>
        <div ng-show="vm.showPassphrase">
          <p>Passphrase for {{ vm.user.account }}:</p>
          <p><code id="claim2-passphrase">{{vm.user.secretPhrase}}</code></p>
        </div>
        <p><span class="md-title">Cashback Coupon</span></p>
        <div ng-show="vm.coupon">
          <p>Cashback coupon code: <b>{{vm.coupon}}</b></p>
        </div>
        <div ng-hide="vm.coupon" layout="column">
          <p>If you have an ICO cashback coupon, please enter it below.<br>
          Cashback claim link will be sent within 2 weeks from HEAT genesis to the email address you used when signing up for the cashback.</p>
          <div ng-hide="vm.coupon" layout="row" class="coupon-input">
            <md-input-container>
              <label>Coupon</label>
              <input ng-model="vm.couponInput1" required name="coupon1">
            </md-input-container>
            <md-button ng-click="vm.saveCoupon($event)" ng-disabled="!vm.couponInput1">Save</md-button>
          </div>
        </div>
      </div>
      <div layout="column" ng-if="vm.status.status == 4"><!-- ClaimStatus.CHALLENGE_VERIFIED_BY_OTHER -->
        <p>This address was already verified and assigned to a different account than you are signed in with *now*.<br>
        Did you perhaps sign in with a different HEAT account?</p>
      </div>
    </div>
  `
})
@Inject('$scope','user','cloud','$q','$timeout','clipboard','$interval','env')
class Claim2Component {
  currency: string; // @input
  address: string; // @input
  currencyLong: string;
  status: ICloudClaimStatus = {
    address: this.address,
    currency: this.currency,
    confirmationAddress: null,
    status : 0,
    publicKey: null
  };
  showPassphrase: boolean = false;
  isFileSaverSupported: boolean = false;
  loading: boolean = false;
  verificationAmount = {
    'BTC':'0.00015000',
    'ETH':'0.001',
    'NXT':'2',
    'FIMK':'2'
  }[this.currency];
  returnAmount = {
    'BTC':'0.00005000',
    'ETH':'0.0005',
    'NXT':'1',
    'FIMK':'1.9'
  }[this.currency];
  nextCheckInSeconds: number = 0;
  verifyWaitPeriodInSeconds = {
    'BTC':30,
    'ETH':30,
    'NXT':30,
    'FIMK':15
  }[this.currency];
  verifyInterval: angular.IPromise<any>;
  verifications: Array<ICloudVerifiedAddress>;
  couponInput1: string;
  coupon: string;

  //debugForceStatus = 3;

  constructor(private $scope: angular.IScope,
              private user: UserService,
              private cloud: CloudService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private clipboard: ClipboardService,
              private $interval: angular.IIntervalService,
              private env: EnvService) {
    try {
      this.isFileSaverSupported = !!new Blob;
    } catch (e) {}
    $scope.$on('$destroy', () => {
      if (this.verifyInterval) {
        $interval.cancel(this.verifyInterval);
      }
    });
  }

  getStatus() {
    this.setLoading(true);
    this.cloud.api.claimStatus(this.address, this.currency.toUpperCase()).then((status) => {
      this.setLoading(false);
      this.$scope.$evalAsync(() => {
        this.status = status;
        if (angular.isDefined(this['debugForceStatus'])) {
          this.status.status = this['debugForceStatus'];
        }
        this.currencyLong = this.currencyToText(this.currency);
        if (this.status.status == ClaimStatus.CHALLENGE_VERIFIED) {
          // lookup verified state
          this.cloud.api.claimVerified().then((verified) => {
            this.$scope.$evalAsync(() => {
              this.verifications = verified.map((v) => {
                v['currencyLong'] = this.currencyToText(v.currency);
                v['href'] = this.addressToEplorerUrl(v.currency, v.address);
                return v;
              });
            });
          });
          // lookup coupon state
          this.cloud.api.claimCouponGet().then((coupon) => {
            this.$scope.$evalAsync(() => {
              this.coupon = coupon;
            })
          });
        }
      })
    })
  }

  createChallenge() {
    this.setLoading(true);
    this.cloud.api.claimCreate(this.address, this.currency.toUpperCase()).then((confirmationAddress) => {
      this.setLoading(false);
      this.$scope.$evalAsync(() => {
        this.status.confirmationAddress = confirmationAddress;
        this.getStatus();
      })
    })
  }

  saveCoupon() {
    this.setLoading(true);
    this.cloud.api.claimCouponSet(this.couponInput1).then(() => {
      this.$scope.$evalAsync(() => {
        this.coupon = this.couponInput1;
      })
    })
  }

  verifyTransfer() {
    this.cloud.api.claimStatus(this.address, this.currency.toUpperCase()).then((status) => {
      if (status.status != ClaimStatus.CHALLENGE_VERIFIED && status.status != ClaimStatus.CHALLENGE_VERIFIED_BY_OTHER) {
        this.startVerifyCountdown();
      }
      else {
        this.$scope.$evalAsync(() => {
          this.status = status;
        });
      }
    });
  }

  startVerifyCountdown() {
    this.nextCheckInSeconds = this.verifyWaitPeriodInSeconds;
    this.verifyInterval = this.$interval(() => { this.nextCheckInSeconds -= 1 }, 1000, this.verifyWaitPeriodInSeconds, true);
    this.verifyInterval.then(() => {
      this.verifyInterval = null;
      this.verifyTransfer();
    });
  }

  currencyToText(currency:string):string {
    switch (currency) {
      case "BTC": return "Bitcoin";
      case "ETH": return "Ethereum";
    }
    return currency; // nxt + fimk
  }

  addressToEplorerUrl(currency: string, address: string) : string {
    switch (currency) {
      case 'BTC': return `https://live.blockcypher.com/btc/address/${address}/`;
      case 'ETH': return `https://etherscan.io/address/${address}`;
      case 'NXT': return `https://lompsa.com/#/accounts/${address}/activity/latest`;
      case 'FIMK': return `https://lompsa.com/#/accounts/${address}/activity/latest`;
    }
  }

  printPassphrase() {
    var style = '<style type="text/css">html { font-family: GillSans, Calibri, Trebuchet, sans-serif; }</style>';
    if (this.env.type == EnvType.NODEJS) {
      var url = `data:text/html,<!DOCTYPE html><head>${style}</head><body>${this.templateHTML()}</body>`;
      var popup = window.open(url);
      this.$timeout(3000,false).then(() => {
        popup.print();
      });
    }
    else {
      var popup = window.open();
      popup.document.write(`
        ${style}
        ${this.templateHTML()}
      `);
      popup.print();
      popup.close();
    }
  }

  savePassphrase() {
    var blob = new Blob([this.templateText()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, `Heat-Ledger-Passphrase-${this.user.account}.txt`);
  }

  copyPassphrase() {
    if (!this.showPassphrase) {
      this.showPassphrase = true;
      this.$scope.$evalAsync(() => {
        this.$timeout(1000, false).then(() => {
          this.clipboard.copyWithUI(document.getElementById('claim2-passphrase'), "Passphrase copied")
        })
      })
    }
    else {
      this.clipboard.copyWithUI(document.getElementById('claim2-passphrase'), "Passphrase copied");
    }
  }

  revealPassphrase() {
    this.showPassphrase = !this.showPassphrase;
  }

  setLoading(loading: boolean) {
    this.$scope.$evalAsync(() => {
      this.loading = loading;
    })
  }

  templateText() {
    return [
      'When stored the passphrase in this document will forever give you access to your HEAT funds.',
      '',
      `Account: ${this.user.account}`,
      '',
      'Passphrase:',
      this.user.secretPhrase,
      '',
      `Publickey:`,
      this.user.publicKey,
      '',
      'http://heatledger.com'].join('\r\n');
  }

  templateHTML() {
    return [
      '<h1>HEAT Paper Wallet</h1>',
      '',
      'When stored the passphrase in this document will forever give you access to your HEAT funds.',
      '',
      `Paper wallet for <b>${this.user.account}</b>`,
      '',
      'Passphrase:',
      `<u>${this.user.secretPhrase}</u>`,
      '',
      `Publickey:`,
      this.user.publicKey,
      ''].join('<br>');
  }
}
