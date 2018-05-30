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
              Address:
            </div>
            <div class="value">
              <a href="#/ethereum-account/{{vm.account}}">{{vm.account}}</a>
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
                <span class="balance">Token: {{item.name}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div flex layout="column">
        <div layout="column" ng-if="vm.pendingTransactions.length">
          <div layout="row" class="trader-component-title">Pending Transactions</div>
          <md-list flex layout-fill layout="column">
            <md-list-item class="header">
              <div class="truncate-col date-col left">Time</div>
              <div class="truncate-col id-col left">Status</div>
              <div class="truncate-col info-col left" flex>Transaction Hash</div>
            </md-list-item>
            <md-list-item ng-repeat="item in vm.pendingTransactions" class="row">
              <div class="truncate-col date-col left">{{item.date}}</div>
              <div class="truncate-col id-col left">
                Pending&nbsp;<elipses-loading></elipses-loading>
              </div>
              <div class="truncate-col info-col left" flex>
                <a target="_blank" href="https://ethplorer.io/tx/{{item.txHash}}">{{item.txHash}}</a>
              </div>
            </md-list-item>
          </md-list>
          <p></p>
        </div>
        <virtual-repeat-eth-transactions layout="column" flex layout-fill account="vm.account" personalize="vm.personalize"></virtual-repeat-eth-transactions>
      </div>
    </div>
  `
})
@Inject('$scope','web3','assetInfo','$q','user','ethplorer',
  'ethereumPendingTransactions','settings','$interval','$mdToast')
class EthereumAccountComponent {
  account: string; // @input

  balanceUnconfirmed: string;
  erc20Tokens: Array<{balance:string, symbol:string, name:string, id:string}> = [];
  personalize: boolean

  pendingTransactions: Array<{date:string, txHash:string, timestamp:number, address:string}> = []
  prevIndex = 0

  constructor(private $scope: angular.IScope,
              private web3: Web3Service,
              private assetInfo: AssetInfoService,
              private $q: angular.IQService,
              private user: UserService,
              private ethplorer: EthplorerService,
              private ethereumPendingTransactions: EthereumPendingTransactionsService,
              private settings: SettingsService,
              private $interval: angular.IIntervalService,
              private $mdToast: angular.material.IToastService) {
    this.personalize = this.account == this.user.account
    this.refresh();

    // TODO register some refresh interval
    // this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    ethereumPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = $interval(this.timerHandler.bind(this), 20000)
    this.timerHandler()

    $scope.$on('$destroy', () => {
      ethereumPendingTransactions.removeListener(listener)
      $interval.cancel(promise)
    })
  }

  /* Continueous timer that polls for one pending txn every 20 seconds,
      in case there is more than one txn pending we test one other
      each iteration */
  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.prevIndex += 1
      if (this.prevIndex>=this.pendingTransactions.length) {
        this.prevIndex = 0
      }
      let pendingTxn = this.pendingTransactions[this.prevIndex]
      this.ethplorer.getTxInfo(pendingTxn.txHash).then(
        data => {
          this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with hash ${pendingTxn.txHash} found`).hideDelay(2000));
          this.ethereumPendingTransactions.remove(pendingTxn.address, pendingTxn.txHash, pendingTxn.timestamp)
        },
        err => {
          console.log('Transaction not found', err)
        }
      )
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.account
      let txns = this.ethereumPendingTransactions.pending[addr]
      if (txns) {
        var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        txns.forEach(tx => {
          this.pendingTransactions.push({
            date: dateFormat(new Date(tx.timestamp), format),
            timestamp: tx.timestamp,
            txHash: tx.txHash,
            address: addr
          })
        })
        this.pendingTransactions.sort((a,b) => b.timestamp-a.timestamp)
      }
    })
  }

  refresh() {
    this.balanceUnconfirmed = "*";
    this.ethplorer.getAddressInfo(this.account).then(info => {
      this.$scope.$evalAsync(()=>{
        this.balanceUnconfirmed = info.ETH.balance;
        if (info.tokens) {
          this.erc20Tokens = info.tokens.map(token => {
            let tokenInfo = this.ethplorer.tokenInfoCache[token.tokenInfo.address]
            return {
              balance: utils.formatQNT((token.balance+"")||"0", tokenInfo?tokenInfo.decimals:8),
              symbol: token.tokenInfo.symbol,
              name: token.tokenInfo.name,
              id: ''
            }
          })
        }
      })
    })
  }
}
