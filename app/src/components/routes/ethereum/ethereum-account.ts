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
@RouteConfig('/ethereum-account/:account')
@Component({
  selector: 'ethereumAccount',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Account:
            </div>
            <div class="value">
              <a href="#/ethereum-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Account id:
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
              {{vm.balanceUnconfirmed}} ETH
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item" flex layout-fill>
            <div class="title">
              ERC-20 Tokens:
            </div>
            <div class="scrollable">
              <div class="value" ng-repeat="item in vm.erc20Tokens">
                <span class="balance">{{item.balance}}</span>
                <span class="symbol"><b>{{item.symbol}}</b></span>
                <span class="name">
                  <a ng-click="vm.showDescription($event, item)">{{item.name}}</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div flex layout="column">
        <virtual-repeat-eth-transactions layout="column" flex layout-fill account="vm.account" personalize="vm.personalize"></virtual-repeat-eth-transactions>
      </div>
    </div>
  `
})
@Inject('$scope','web3','assetInfo','$q','user')
class EthereumAccountComponent {
  account: string; // @input

  balanceUnconfirmed: string;
  erc20Tokens: Array<{balance:string, symbol:string, name:string, id:string}> = [];
  personalize: boolean

  constructor(private $scope: angular.IScope,
              private web3: Web3Service,
              private assetInfo: AssetInfoService,
              private $q: angular.IQService,
              private user: UserService) {
    this.personalize = this.account == this.user.account
    this.refresh();

    // TODO register some refresh interval
    // this.refresh();
  }

  refresh() {
    this.balanceUnconfirmed = "*";
    this.web3.getBalanceOf(this.account).then(balance => {
      this.$scope.$evalAsync(()=>{
        this.balanceUnconfirmed = balance;
      })
    }, err => console.log(err))

    // load erc20 data
  }

  showDescription($event, info: AssetInfo) {
    dialogs.assetInfo($event, info);
  }
}
