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
@Component({
  selector: 'traderBalances',
  inputs: ['currencyInfo','assetInfo'],
  styles: [`
  trader-balances .symbol-col {
    text-align:left;
  }
  trader-balances .balance-col {
    width: 100px;
  }
  trader-balances {
    height: 440px;
  }
  `],
  template: `
    <div layout="column" layout-fill>
      <div layout="row" class="trader-component-title">Account balance&nbsp;
        <span flex></span>
        {{vm.user.account}}
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item>
          <div class="truncate-col symbol-col">Asset</div>
          <div class="truncate-col balance-col right-align" flex>Balance</div>
        </md-list-item>
        <md-virtual-repeat-container flex layout-fill layout="column"
            virtual-repeat-flex-helper ng-if="vm.balances.length>0">
          <md-list-item md-virtual-repeat="item in vm.balances">
            <div class="truncate-col symbol-col">{{item.symbol}}</div>
            <div class="truncate-col balance-col right-align" flex>{{item.balance}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})
@Inject('$scope','heat','user','assetInfo','HTTPNotify')
class TraderBalancesComponent {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  balances: Array<IHeatAccountBalance> = [];

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private user: UserService,
              private assetInfoService: AssetInfoService,
              HTTPNotify: HTTPNotifyService) {
    HTTPNotify.on(()=>{this.loadBalances()}, $scope);
    this.loadBalances();
  }

  loadBalances() {
    this.heat.api.getAccountBalances(this.user.account, "0", 1, 0, 100).then((balances) => {
      this.$scope.$evalAsync(() => {
        this.balances = balances;
        balances.forEach((balance: IHeatAccountBalance|any) => {
          var assetInfo = this.assetInfoService.parseProperties(balance.properties, {
            name: "",
            symbol: balance.id == "0" ? "HEAT" : balance.id
          });
          balance.symbol = assetInfo.symbol;
          balance.name = assetInfo.name;
          balance.balance = utils.formatQNT(balance.virtualBalance, balance.decimals);
        });
        balances.sort((a:any,b:any)=> {
          if (a.symbol < b.symbol) return -1;
          if (a.symbol > b.symbol) return 1;
          return 0;
        });
      })
    });
  }
}