namespace wlt {

    export function exploreAddresses(walletEntry: wlt.WalletEntry, currencyName, walletComponent: WalletComponent) {
        let currency = wlt.CURRENCIES[currencyName]
        let addressesPromise
        if (currencyName == 'Bitcoin') addressesPromise = wlt.findBitcoinAddresses(walletEntry)
        if (currencyName == 'Ethereum') addressesPromise = wlt.findEthereumAddresses(walletEntry, walletComponent.lightwalletService)
        addressesPromise.then(promises => {
            let report = []
            for (const p of promises) {
                p.then(item => {
                    report.push(item)
                    item.visible = true
                    item.visible2 = true
                    item.empty = !(item.balance > 0 || item.txs > 0)
                    if (item.empty) {
                        // timeout with css for animation
                        setTimeout(() => {
                            walletComponent.$scope.$evalAsync(() => {
                                item.visible = false
                            })
                            setTimeout(() => {
                                item.visible2 = false
                                /*let j = report.indexOf(item)
                                if (j > -1) report.splice(j, 1)*/
                            }, Math.random() * 1500)
                        }, 1000 + Math.random() * 2000)
                    }
                }).catch(reason => console.error(reason))
            }
            Promise.all(promises).then(() => report.sort((a, b) => a.index - b.index))

            showAddresses(currency, report, walletEntry, walletComponent)
        })
    }

    export function showAddresses(currency, report: any[], walletEntry: wlt.WalletEntry, walletComponent: WalletComponent) {
        return dialogs.dialog({
            id: 'exploredAddresses',
            title: `${currency.name} addresses for account ${walletEntry.account}`,
            targetEvent: null,
            okButton: true,
            cancelButton: false,
            locals: {
                report: report,
                account: walletEntry.account,
                currencyName: currency.name,
                currencySym: currency.symbol,
                displayEmptyOnly: true,
                updateView: displayNotEmptyOnly => {
                    walletComponent.$scope.$evalAsync(() => {
                        for (const item of report) {
                            item.visible = displayNotEmptyOnly ? !item.empty : true
                            item.visible2 = item.visible
                        }
                    })
                },
                addAddress: item => {
                    if (currency.symbol == wlt.CURRENCIES.Ethereum.symbol) {
                        addEthAddress(
                            walletEntry, walletComponent, walletComponent.$mdDialog,
                            {
                                address: item.address,
                                privateKey: item.privateKey,
                                index: item.index,
                                balance: item.balance,
                                inUse: true
                            }
                        )
                    }
                    if (currency.symbol == wlt.CURRENCIES.Bitcoin.symbol) {
                        addBtcAddress(
                            walletEntry, walletComponent, walletComponent.$mdDialog,
                            {
                                address: item.address,
                                privateKey: item.privateKey,
                                index: item.index,
                                balance: item.balance,
                                inUse: true
                            }
                        )
                    }
                    item.added = true
                }
            },
            template: `
        <md-checkbox ng-model="vm.displayEmptyOnly" ng-change="vm.updateView(vm.displayEmptyOnly)">Not empty addresses only</md-checkbox>
        <div layout="column" flex>
          <code ng-repeat="item in vm.report" class="explore-address-item item"
                    ng-if="item.visible2" 
                    ng-class="{'not-empty-address': !item.empty, 'scale-up': item.visible, 'scale-down': !item.visible}">
              #{{item.index}} <span style="color: #d9d20c">{{item.address}}</span> {{item.balance}} {{vm.currencySym}} &nbsp; 
              <span style="white-space: nowrap;">transactions: {{item.txs}}</span>
            <button ng-if="!item.added" ng-click="vm.addAddress(item)" title="Add address to wallet entry">
              Add
            </button>
            <span style="color: darkgreen" ng-if="item.added">Added</span>
          </code>
      </div>
      `,
            style: `
    @keyframes scaleUp {
      0% { transform: scale(0.1); }
      100% { transform: scale(1)}
    }
    @keyframes scaleDown {
      0% { transform: scale(1); }
      100% { transform: scale(0)}
    }
    .scale-up {
      animation: scaleUp 1s;
    }
    .scale-down {
      animation: scaleDown 1s forwards;
    }
    .explore-address-item {
        background-color: lightslategrey;
        border-radius: 9px;
        padding: 6px;
        margin: 4px;
    }
    .not-empty-address {
      background-color: #58935a !important;
    }
      `
        })
    }

}
