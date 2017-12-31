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
@RouteConfig('/explorer-account/:account/:type')
@Component({
  selector: 'explorerAccount',
  inputs: ['account','type'],
  template: `
    <div layout="column" flex layout-fill>
      <explorer-search layout="column" type="''" query="''"></explorer-search>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Account:
            </div>
            <div class="value">
              <a href="#/explorer-account/{{vm.account}}/{{vm.type}}">{{vm.accountName||vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Numeric account id:
            </div>
            <div class="value">
              {{vm.account}}
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance:
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} HEAT
            </div>
          </div>
        </div>
        <div layout="column">
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
              Lease: [{{vm.leaseTitle}}]
            </div>
            <div class="value">
              <span ng-if="vm.currentLessee=='0'">None</span>
              <span ng-if="vm.currentLessee!='0'">
                <a href="#/explorer-account/{{vm.currentLessee}}/{{vm.type}}">{{vm.currentLesseeName}}</a>
              </span>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Next lease: [{{vm.nextLeaseTitle}}]
            </div>
            <div class="value">
              <span ng-if="vm.nextLessee=='0'">None</span>
              <span ng-if="vm.nextLessee!='0'">
                <a href="#/explorer-account/{{vm.nextLessee}}/{{vm.type}}">{{vm.nextLesseeName}}</a>
              </span>
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              Total rewards:
            </div>
            <div class="value">
              {{vm.totalRewards}}
            </div>
          </div>
          <div class="col-item" flex layout-fill>
            <div class="title">
              Assets:
            </div>
            <div class="scrollable">
              <div class="value" ng-repeat="item in vm.assetInfos">
                <span class="balance">{{item.balance}}</span>
                <span class="symbol"><b>{{item.symbol}}</b></span>
                <span class="name">
                  <a ng-click="vm.showDescription($event, item)">{{item.name}}</a>
                </span>
                <span class="issuer">
                  Issued by: <a href="#/explorer-account/{{item.issuer}}/{{vm.type}}">{{item.issuerPublicName||item.issuer}}</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div layout="row" layout-align="start center" class="type-row">
        <md-button ng-class="{'active':vm.type=='accounts'}"
          ng-disabled="vm.type=='transactions'"
          ng-href="#/explorer-account/{{vm.account}}/transactions">Transactions</md-button>
        <md-button ng-class="{'active':vm.type=='blocks'}"
          ng-disabled="vm.type=='blocks'"
          ng-href="#/explorer-account/{{vm.account}}/blocks">Blocks</md-button>
        <md-button ng-class="{'active':vm.type=='lessors'}"
          ng-disabled="vm.type=='lessors'"
          ng-href="#/explorer-account/{{vm.account}}/lessors">Lessors</md-button>
      </div>
      <div ng-if="vm.type=='transactions'" flex layout="column">
        <virtual-repeat-transactions hide-label="true" layout="column" flex layout-fill account="vm.account"></virtual-repeat-transactions>
      </div>
      <div ng-if="vm.type=='blocks'" flex layout="column">
        <explorer-latest-blocks layout="column" flex account="vm.account" hide-label="true"></explorer-latest-blocks>
      </div>
      <div ng-if="vm.type=='lessors'" flex layout="column" layout-fill>
        <md-list flex layout-fill layout="column" class="lessors">
          <md-list-item class="header">
            <div class="truncate-col id-col left">ID</div>
            <div class="truncate-col balance-col left">Balance</div>
            <div class="truncate-col from-col left">From</div>
            <div class="truncate-col to-col left">To</div>
            <div class="truncate-col next-lessee-col">Next</div>
            <div class="truncate-col from-col">From</div>
            <div class="truncate-col to-col" flex>To</div>
          </md-list-item>
          <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
            <md-list-item md-virtual-repeat="item in vm.lessors" aria-label="Entry">
              <div class="truncate-col id-col left">
                <a href="#/explorer-account/{{item.id}}/transactions">{{item.id}}</a>
              </div>
              <div class="truncate-col balance-col">
                {{item.balance}}
              </div>
              <div class="truncate-col from-col left">
                {{item.currentHeightFrom}}
              </div>
              <div class="truncate-col to-col left">
                {{item.currentHeightTo}}
              </div>
              <div class="truncate-col next-lessee-col">
                <a ng-if="item.nextLessee" href="#/explorer-account/{{item.nextLessee}}/transactions">{{item.nextLessee}}</a>
              </div>
              <div class="truncate-col from-col">
                {{item.nextHeightFrom}}
              </div>
              <div class="truncate-col to-col" flex>
                {{item.nextHeightTo}}
              </div>
            </md-list-item>
          </md-virtual-repeat-container>
        </md-list>
      </div>
    </div>
  `
})
@Inject('$scope','heat','assetInfo','$q')
class ExploreAccountComponent {
  account: string; // @input
  type: string; // @input

  accountName: string;
  email: string;
  publicKey: string;
  firstSeen: string;
  lease: string;
  leaseBlocksRemain: string;
  totalRewards: string;
  effectiveBalance: string;
  balanceUnconfirmed: string;
  balanceConfirmed: string;
  assetInfos: Array<AssetInfo> = [];


  currentLessee: string;
  currentLesseeName: string;
  currentLeasingHeightFrom: number;
  currentLeasingHeightTo: number;
  currentLeasingRemain: number;
  nextLessee: string;
  nextLesseeName: string;
  nextLeasingHeightFrom: number;
  nextLeasingHeightTo: number;
  leaseTitle: string;
  nextLeaseTitle: string;
  lessors: Array<IHeatLessors>;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private assetInfo: AssetInfoService,
              private $q: angular.IQService) {
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
    this.totalRewards = "*";
    this.effectiveBalance = "*";
    this.balanceUnconfirmed = "*";
    this.balanceConfirmed = "*";

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
        this.currentLessee = account.currentLessee;
        this.currentLesseeName = account.currentLesseeName || account.currentLessee;
        this.currentLeasingHeightFrom = account.currentLeasingHeightFrom;
        this.currentLeasingHeightTo = account.currentLeasingHeightTo;
        this.nextLessee = account.nextLessee;
        this.nextLesseeName = account.nextLesseeName || account.nextLessee;
        this.nextLeasingHeightFrom = account.nextLeasingHeightFrom;
        this.nextLeasingHeightTo = account.nextLeasingHeightTo;
        this.lessors = <Array<IHeatLessors>>account.lessors;
        if (angular.isArray(this.lessors)) {
          this.lessors.forEach((lessor:any) => {
            lessor.balance = utils.formatQNT(lessor.effectiveBalance, 8) + " HEAT";
            if (lessor.nextLessee=="0") {
              lessor.nextLessee = "";
            }
            if (lessor.nextHeightFrom==2147483647||lessor.nextHeightFrom==lessor.currentHeightFrom) {
              lessor.nextHeightFrom = "";
            }
            if (lessor.nextHeightTo==2147483647) {
              lessor.nextHeightTo = "";
            }
          });
        }
      });
      if (this.currentLessee != "0") {
        this.heat.api.getBlockchainStatus().then(status=>{
          this.$scope.$evalAsync(()=>{
            this.currentLeasingRemain = status.lastBlockchainFeederHeight - account.currentLeasingHeightTo;
            this.leaseTitle = `from ${this.currentLeasingHeightFrom} to ${this.currentLeasingHeightTo} remain ${this.currentLeasingRemain}`;
            this.nextLeaseTitle = `from ${this.nextLeasingHeightFrom} to ${this.nextLeasingHeightTo}`;
          })
        })
      }
    });

    this.getAccountAssets().then(assetInfos=>{
      this.$scope.$evalAsync(()=>{
        this.assetInfos = assetInfos.map(info => {
          info['balance'] = utils.formatQNT(info.userBalance, 8);
          return info;
        });
      })
    })

    this.heat.api.rewardsAccount(this.account).then(info=>{
      this.$scope.$evalAsync(()=>{
        this.totalRewards = utils.commaFormat(utils.formatQNT(info.totalRewards, 8))
      })
    });
  }

  showDescription($event, info: AssetInfo) {
    dialogs.assetInfo($event, info);
  }

  private getAccountAssets(): angular.IPromise<Array<AssetInfo>> {
    let deferred = this.$q.defer<Array<AssetInfo>>();
    this.heat.api.getAccountBalances(this.account, "0", 1, 0, 100).then(balances => {
      let assetInfos: Array<AssetInfo> = [];
      let promises = [];
      balances.forEach(balance=>{
        if (balance.id != '0') {
          promises.push(
            this.assetInfo.getInfo(balance.id).then(info=>{
              assetInfos.push(angular.extend(info, {
                userBalance: balance.balance
              }))
            })
          );
        }
      });
      if (promises.length > 0) {
        this.$q.all(promises).then(()=>{
          assetInfos.sort((a,b)=>{
            var textA = a.symbol.toUpperCase();
            var textB = b.symbol.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
          });
          deferred.resolve(assetInfos);
        }, deferred.reject);
      }
      else {
        deferred.resolve([]);
      }
    }, deferred.reject);
    return <angular.IPromise<Array<AssetInfo>>> deferred.promise;
  }
}
