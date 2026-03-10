namespace wlt {

  function search(report: any[], currency, derivationPath, walletEntry: wlt.WalletEntry, walletComponent: WalletComponent) {
    walletComponent.$scope.$evalAsync(() => {
      //remove previous empty addresses
      for (let i = report.length - 1; i >= 0; i--) {
        if (report[i].empty) report.splice(i, 1)
      }
      let addressesPromise
      if (currency.name == 'Bitcoin') addressesPromise = wlt.findBitcoinAddresses(walletEntry, derivationPath)
      if (currency.name == 'Ethereum') addressesPromise = wlt.findEthereumAddresses(walletEntry, derivationPath, walletComponent.lightwalletService)
      addressesPromise.then(promises => {
        for (const p of promises) {
          p.then(item => {
            report.push(item)
            item.visible = true
            item.visible2 = true
            item.empty = !(item.balance > 0 || item.txs > 0)
            if (item.empty) {
              // timeout with css for animation
              setTimeout(() => {
                item.visible = false
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
      })
    })
  }

  export function exploreAddresses(currencyName, walletEntry: wlt.WalletEntry, walletComponent: WalletComponent) {
    let currency = wlt.CURRENCIES[currencyName]
    showAddresses(currency, walletEntry, walletComponent)
  }

  function showAddresses(currency, walletEntry: wlt.WalletEntry, walletComponent: WalletComponent) {
    let report = []
    return dialogs.dialog({
      id: 'exploredAddresses',
      title: `${currency.name} addresses explorer for account ${walletEntry.account}`,
      targetEvent: null,
      okButton: true,
      cancelButton: false,
      locals: {
        report: report,
        account: walletEntry.account,
        currencyName: currency.name,
        currencySym: currency.symbol,
        displayIncludingEmpty: false,
        derivationPath: currency.derivationPaths[0].path,
        standardDerivationPaths: currency.derivationPaths,
        search: (derivationPath) => search(report, currency, derivationPath, walletEntry, walletComponent),
        updateView: displayNotEmptyOnly => {
          walletComponent.$scope.$evalAsync(() => {
            for (const item of report) {
              item.visible = this.displayIncludingEmpty || !item.empty
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
        <div layout="row" flex style="min-height: 55px;">
          <md-input-container flex>
            <label>Standard derivation paths</label>
            <md-select ng-model="vm.derivationPath" placeholder="Select path" auto-focus>
              <md-option ng-repeat="dp in vm.standardDerivationPaths" value="{{dp.path}}">{{dp.path}} &nbsp;&nbsp;{{dp.desc}}</md-option>
            </md-select>
          </md-input-container>
          <md-input-container flex>
            <label>Custom derivation path</label>
            <input ng-model="vm.derivationPath" required name="derivationPath">
          </md-input-container>
          <md-button ng-if="vm.derivationPath" ng-click="vm.search(vm.derivationPath)">Search</md-button>
        </div>
        <md-checkbox ng-model="vm.displayIncludingEmpty">Display empty addresses</md-checkbox>
        <div layout="column" flex>
          <code ng-repeat="item in vm.report" class="explore-address-item item"
                    ng-if="vm.displayIncludingEmpty || !item.empty"
                    ng-class="{'not-empty-address': !item.empty, 'scale-up': vm.displayIncludingEmpty || !item.empty, 'scale-down': !(vm.displayIncludingEmpty || !item.empty)}">
              <span class="derivation-path">{{item.path}}</span>
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
    .derivation-path {
      white-space: nowrap;
      color: lightgray;
      padding: 0px 2px 0px 4px;
    }
      `
    })
  }

}
