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
@RouteConfig('/explorer-account/:account')
@Component({
  selector: 'explorerAccount',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill layout-padding >
      <explorer-search layout="column"></explorer-search>
      <div layout="row" class="explorer-detail">
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              Account:
            </div>
            <div class="value">
              <a href="#/explorer-account/{{vm.account}}">{{vm.accountName||vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Leased to:
            </div>
            <div class="value">
              <span ng-if="!vm.leasedToAccount">None</span>
              <a ng-if="vm.leasedToAccount" href="#/explorer-account/{{vm.leasedToAccount}}">{{vm.leasedToAccountName||vm.leasedToAccount}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Lease blocks remain:
            </div>
            <div class="value">
              {{vm.leaseBlocksRemain}}
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              Effective bal:
            </div>
            <div class="value">
              {{vm.effectiveBalance}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance (unconfirmed):
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance (confirmed):
            </div>
            <div class="value">
              {{vm.balanceConfirmed}} HEAT
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              First seen:
            </div>
            <div class="value">
              {{vm.firstSee}}
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Forged:
            </div>
            <div class="value">
              {{vm.forged}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">

            </div>
            <div class="value">

            </div>
          </div>
        </div>
      </div>
      <virtual-repeat-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-transactions>
    </div>
  `
})
@Inject('$scope','heat')
class ExploreAccountComponent {
  account: string; // @input

  accountName: string;
  email: string;
  publicKey: string;
  firstSeen: string;
  lease: string;
  leaseBlocksRemain: string;
  forged: string;
  effectiveBalance: string;
  balanceUnconfirmed: string;
  balanceConfirmed: string;
  leasedTo: string;

  constructor(private $scope: angular.IScope,
              public heat: HeatService) {
    this.refresh();

    heat.subscriber.balanceChanged({ account: this.account, currency: "0" }, () => {
      this.refresh();
    }, $scope);
  }

  refresh() {
    this.accountName = "*";
    this.email = "*";
    this.publicKey = "*";
    this.firstSeen = "*";
    this.lease = "*";
    this.leaseBlocksRemain = "*";
    this.forged = "*";
    this.effectiveBalance = "*";
    this.balanceUnconfirmed = "*";
    this.balanceConfirmed = "*";
    this.leasedTo = "*";

    this.heat.api.getPublicKey(this.account).then((publicKey)=>{
      this.$scope.$evalAsync(()=>{
        this.publicKey = publicKey;
      })
    });

    this.heat.api.getAccountByNumericId(this.account).then((account)=>{
      this.$scope.$evalAsync(()=>{
        this.accountName = account.publicName;
        this.balanceConfirmed = utils.formatQNT(account.balance, 8);
        this.effectiveBalance = utils.formatQNT(account.effectiveBalance, 8);
        this.balanceUnconfirmed = utils.formatQNT(account.unconfirmedBalance, 8);
        this.genesisAccountNameOverride();
      });
    });
  }

  genesisAccountNameOverride() {
    if (this.account == "8150091319858025343") {
      this.accountName = "HEAT blockchain Genesis account";
    }
  }
}
