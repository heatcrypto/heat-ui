/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
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

type PendingType = {
  date: string
  txId: string
  time: number
  address: string
  message?: {method: number, text: string} //linked message
}

@RouteConfig('/bitcoin-account/:account')
@Component({
  selector: 'bitcoinAccount',
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
              <a href="#/bitcoin-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance: <md-progress-circular md-mode="indeterminate" md-diameter="20px" ng-show="vm.busy"></md-progress-circular>
            </div>
            <div class="value">
              {{vm.balance}} BTC
              <span style="font-size: small" ng-if="vm.balanceUnconfirmed && vm.balanceUnconfirmed != vm.balance"><br>{{vm.balanceUnconfirmed}} (unconfirmed)</span>
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
              <div class="truncate-col tx-col left" flex>Transaction Id</div>
              <div class="truncate-col info-col left" flex>Message</div>
            </md-list-item>
            <md-list-item ng-repeat="item in vm.pendingTransactions" class="row">
              <div class="truncate-col date-col left">{{item.date}}</div>
              <div class="truncate-col id-col left">
                Pending&nbsp;<elipses-loading></elipses-loading>
              </div>
              <div class="truncate-col tx-col left" flex>
                <a target="_blank" rel="noopener noreferrer" href="https://live.blockcypher.com/btc/tx/{{item.txId}}">{{item.txId}}</a>
              </div>
              <div class="truncate-col left" ng-if="item.message">
                <span style="opacity: 0.5">[{{item.message.method == 0 ? "local" : "HEAT"}}]</span> 
                {{item.message.text}}
                <md-tooltip md-delay="800">{{item.message.text}}</md-tooltip>
              </div>
              <span ng-if="!item.message" class="truncate-col left" style="opacity: 0.5">-</span>
            </md-list-item>
          </md-list>
          <p></p>
        </div>
        <virtual-repeat-btc-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-btc-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'btcBlockExplorerService', 'bitcoinPendingTransactions', '$interval', '$mdToast', 'settings', 'user', 'heat')
class BitcoinAccountComponent {
  account: string; // @input
  balanceUnconfirmed: string;
  balance: string;
  pendingTransactions: PendingType[] = []
  prevIndex = 0
  busy = true

  constructor(private $scope: angular.IScope,
              private btcBlockExplorerService: BtcBlockExplorerService,
              private bitcoinPendingTransactions: BitcoinPendingTransactionsService,
              private $interval: angular.IIntervalService,
              private $mdToast: angular.material.IToastService,
              private settings: SettingsService,
              private user: UserService,
              private heat: HeatService) {
  }

  $onInit() {
    this.refresh()

    let listener = this.updatePendingTransactions.bind(this)
    this.bitcoinPendingTransactions.addListener(listener)
    this.updatePendingTransactions()

    let promise = this.$interval(this.timerHandler.bind(this), 12_000)
    this.timerHandler()

    this.$scope.$on('$destroy', () => {
      this.bitcoinPendingTransactions.removeListener(listener)
      this.$interval.cancel(promise)
    })
  }

  timerHandler() {
    this.refresh()
    if (this.pendingTransactions.length) {
      this.prevIndex += 1
      if (this.prevIndex >= this.pendingTransactions.length) {
        this.prevIndex = 0
      }
      let pendingTxn = this.pendingTransactions[this.prevIndex]
      this.btcBlockExplorerService.getTxInfo(pendingTxn.txId).then(
        data => {
          if (data.blockheight !== -1) {
            this.$mdToast.show(this.$mdToast.simple().textContent(`Transaction with id ${pendingTxn.txId} found`).hideDelay(2000));
            this.bitcoinPendingTransactions.remove(pendingTxn.address, pendingTxn.txId, pendingTxn.time)
          }
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
      let addr = this.user.currency.address
      let txns = this.bitcoinPendingTransactions.pending[addr]
      if (txns) {
        let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        txns.forEach(tx => {
          this.pendingTransactions.push({
            date: dateFormat(new Date(tx.time), format),
            time: tx.time,
            txId: tx.txId,
            address: addr
          })
        })
        this.pendingTransactions.sort((a, b) => b.time - a.time)
        this.loadPaymentMessages()
      }
    })
  }

  refresh() {
    this.busy = true
    this.balanceUnconfirmed = ""
    let balanceUnconfirmedHolder: number
    this.btcBlockExplorerService.getBalance(this.account).then(unconfirmedBalance => {
      this.$scope.$evalAsync(() => {
        balanceUnconfirmedHolder = unconfirmedBalance
        this.busy = false
      })
    }).finally(() => {
      let b = wlt.getSavedCurrencyBalance(this.account, "BTC", balanceUnconfirmedHolder ? String(balanceUnconfirmedHolder) : null)
      this.balance = b.confirmed ? new Big(b.confirmed).div(wlt.SATOSHI_PER_BTC).toFixed(8) : null
      this.balanceUnconfirmed = b.unconfirmed ? new Big(b.unconfirmed).div(wlt.SATOSHI_PER_BTC).toFixed(8) : null
    })
    this.loadPaymentMessages()
  }

  private loadPaymentMessages() {
    for (const ptx of this.pendingTransactions) {
      //processed item has message value or null
      if (ptx.message === undefined) {
        wlt.loadPaymentMessage(ptx.txId)
            .then(v => ptx.message = v)
            .catch(reason => console.warn("payment message is not loaded: " + JSON.stringify(reason)))
      }
    }
  }

}
