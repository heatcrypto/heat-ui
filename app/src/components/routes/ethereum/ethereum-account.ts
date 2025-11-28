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
  styles: [`
    .value a {
      text-decoration: none !important;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Address:
            </div>
            <div class="value">
              <a ng-click="vm.addressDetails($event, vm.account)">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance:
            </div>
            <div class="value" ng-if="vm.balanceUnconfirmed">
              {{vm.balanceUnconfirmed}} ETH
              <span style="font-size: small; opacity: 0.7"><br>{{vm.balance}} (confirmed)</span>
              <span ng-if="vm.cachedItems" style="opacity: 0.8; color: darkorange">&nbsp; (cached)</span>
            </div>
            <div class="value" ng-if="!vm.balanceUnconfirmed">
              {{vm.balance}} ETH
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
              <div class="truncate-col left" flex>Message</div>
            </md-list-item>
            <md-list-item ng-repeat="item in vm.pendingTransactions" class="row">
              <div class="truncate-col date-col left">{{item.date}}</div>
              <div class="truncate-col id-col left">
                Pending&nbsp;<elipses-loading></elipses-loading>
              </div>
              <div class="truncate-col info-col left" flex>
                <a target="_blank" rel="noopener noreferrer" href="https://eth1.heatwallet.com/api/v2/tx/{{item.txHash}}">{{item.txHash}}</a>
              </div>
              <div class="truncate-col left" ng-if="item.message">
                <span style="opacity: 0.5">[{{item.message.method == 0 ? "local" : "HEAT"}}]</span> 
                {{item.message.text}}
                <md-tooltip md-delay="800">{{item.message.text}}</md-tooltip>
              </div>
              <span ng-if="!item.message" class="truncate-col left" style="opacity: 0.5">--</span>
            </md-list-item>
          </md-list>
          <p></p>
        </div>
        <virtual-repeat-eth-transactions layout="column" flex layout-fill account="vm.account" personalize="vm.personalize"></virtual-repeat-eth-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'web3', 'assetInfo', '$q', 'user', 'ethBlockExplorerService',
  'ethereumPendingTransactions', 'settings', '$interval', '$mdToast', 'http')
class EthereumAccountComponent {
  account: string; // @input

  balance: string;
  balanceUnconfirmed: string;
  erc20Tokens: Array<{ balance: string, symbol: string, name: string, id: string }> = [];
  personalize: boolean

  pendingTransactions: Array<{ date: string, txHash: string, timestamp: number, address: string, message?: {method: number, text: string} }> = []
  prevIndex = 0

  constructor(private $scope: angular.IScope,
              private web3: Web3Service,
              private assetInfo: AssetInfoService,
              private $q: angular.IQService,
              private user: UserService,
              private ethBlockExplorerService: EthBlockExplorerService,
              private pendingService: EthereumPendingTransactionsService,
              private settings: SettingsService,
              private $interval: angular.IIntervalService,
              private $mdToast: angular.material.IToastService,
              private http: HttpService) {
  }

  $onInit() {
    this.personalize = this.account == this.user.currency.address
    this.refresh();

    // TODO register some refresh interval
    // this.refresh();

    let listener = this.updatePendingTransactions.bind(this)
    this.pendingService.addListener(listener)
    this.updatePendingTransactions()

    let promise = this.$interval(this.timerHandler.bind(this), 20000)
    this.timerHandler()

    this.$scope.$on('$destroy', () => {
      this.pendingService.removeListener(listener)
      this.$interval.cancel(promise)
    })
  }

  /* Continueous timer that polls for one pending txn every 20 seconds,
      in case there is more than one txn pending we test one other
      each iteration */
  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.prevIndex += 1
      if (this.prevIndex >= this.pendingTransactions.length) {
        this.prevIndex = 0
      }
      let pendingTxn = this.pendingTransactions[this.prevIndex]
      if (!utils.isHex(pendingTxn.txHash)) {
        this.pendingService.remove(pendingTxn.address, pendingTxn.txHash, pendingTxn.timestamp)
        return
      }
      this.ethBlockExplorerService.getTxInfo(pendingTxn.txHash).then(
        data => {
          if (data.confirmations && data.confirmations > 0) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with hash ${pendingTxn.txHash} found`).hideDelay(2000));
            this.pendingService.remove(pendingTxn.address, pendingTxn.txHash, pendingTxn.timestamp)
          }
          if (data.error && data.error.indexOf("not found") > -1) {
            this.pendingService.remove(pendingTxn.address, pendingTxn.txHash, pendingTxn.timestamp)
          }
        },
        err => {
          console.log('Error on load transaction using pending transaction hash', JSON.stringify(err || ""))
        }
      )
    }
  }

  updatePendingTransactions() {
    this.$scope.$evalAsync(() => {
      this.pendingTransactions = []
      let addr = this.user.currency.address
      let txns = this.pendingService.pending[addr]
      if (txns) {
        const format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        txns.forEach(tx => {
          this.pendingTransactions.push({
            date: dateFormat(new Date(tx.timestamp), format),
            timestamp: tx.timestamp,
            txHash: tx.txHash,
            address: addr
          })
        })
        this.pendingTransactions.sort((a, b) => b.timestamp - a.timestamp)
        setTimeout(() => this.loadPaymentMessages(), 1500)
      }
    })
  }

  refresh() {
    wlt.getSavedCurrencyBalance(this.account, "ETH").then(balances => {
      this.balance = isNaN(parseFloat(balances.confirmed)) ? '*' : balances.confirmed
      this.balanceUnconfirmed = balances.unconfirmed
      this.ethBlockExplorerService.getAddressInfo(this.account).then(info => {
        this.$scope.$evalAsync(() => {
          wlt.getSavedCurrencyBalance(this.account, "ETH", info.ETH.balance).then(balances => {
            this.balance = isNaN(parseFloat(balances.confirmed)) ? '*' : balances.confirmed
            this.balanceUnconfirmed = balances.unconfirmed
            //this.balanceUnconfirmed = new Big(info.ETH.balance).toFixed(18);
            if (info.tokens) {
              this.erc20Tokens = info.tokens.map(token => {
                let tokenInfo = this.ethBlockExplorerService.tokenInfoCache[token.tokenInfo.address]
                let balance = token.balance
                    ? utils.formatERC20TokenAmount(new Big(token.balance + "").toFixed(), tokenInfo ? tokenInfo.decimals : 18)
                    : ""
                return {
                  balance: balance,
                  symbol: token.tokenInfo.symbol,
                  name: token.tokenInfo.name,
                  id: ''
                }
              })
            }
          })
        })
      })
    })

    // to cache nonce
    let web3 = <Web3Service> heat.$inject.get('web3')
    web3.getAddressNonce(this.account)

    this.loadPaymentMessages()

    // remove obsolete pending transactions
    for (const ptx of this.pendingTransactions) {
      let minutesOld = (Date.now() - ptx.timestamp) / (1000*60)
      if (minutesOld > 60) {
        this.pendingService.remove(ptx.address, ptx.txHash, ptx.timestamp)
        console.log('Pending ETH transaction is removed from pending list due overtimed', JSON.stringify(ptx))
      }
    }
  }

  private loadPaymentMessages() {
    for (const ptx of this.pendingTransactions) {
      //processed item has message value or null so undefined is needed to be processed
      if (ptx.message === undefined) {
        let p = <Promise<{ method: number; text: string; }>>wlt.loadPaymentMessage(ptx.txHash)
        p.then(v => ptx.message = v)
            .catch(reason => console.warn("payment message is not loaded: " + JSON.stringify(reason)))
      }
    }
  }

  addressDetails($event, address) {
    this.ethBlockExplorerService.getAddressInfo(address, true).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response
      if (parsed) {
        parsed.renderedAmount = (parsed.ETH?.balance || ((parsed.balance || 0) / 1000000000000000000)) + " ETH"
        parsed.countTxs = parsed.countTxs || parsed.txs
        let fields = [["address"], ["renderedAmount", "balance"], ["countTxs", "number of transactions"]]
        if (parsed.nonce) fields.push(["nonce"])
        dialogs.jsonDetails(null, parsed, 'Address: ' + parsed.address, fields, null, true)
      }
    },reason => {
      if (reason) console.error(reason)
    })
  }

}
