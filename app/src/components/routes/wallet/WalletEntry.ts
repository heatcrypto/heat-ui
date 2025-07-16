/*
 * The MIT License (MIT)
 * Copyright (c) 2016-2021 HEAT DEX.
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

namespace wlt {

  export class WalletEntry extends EntryAbstract {
    public isWalletEntry = true
    public selected = true
    public identifier: string
    public visibleLabel: string
    public label: string
    public secretPhrase: string
    public bip44Compatible: boolean
    public currencies: Array<CurrencyBalance | CurrencyAddressCreate | CurrencyAddressLoading> = []
    public pin: string
    public unlocked = false
    public expanded = false

    constructor(public account: string,
                public name: string,
                public component: WalletComponentAbstract //user may assign any text for wallet account
    ) {
      super()
      this.visible = true
      this.identifier = name ? `${account} | ${name}` : account
      this.visibleLabel = getEntryVisibleLabel(this.account)
      this.bip44Compatible = getEntryBip44Compatible(this.account)
    }

    setWalletComponent(component: WalletComponentAbstract) {
      this.component = component
    }

    public toggle(forceVisible?: boolean) {
      this.expanded = forceVisible || !this.expanded
      this.currencies.forEach(curr => {
        let currency = <any>curr
        currency.visible = this.expanded
        if (currency.tokens) {
          currency.tokens.forEach(token => {
            token.visible = this.expanded
          })
        }
      })
      if (this.expanded) {
        this.component.loadEthereumAddresses(this)
        this.component.loadBitcoinAddresses(this)
        this.component.loadFIMKAddresses(this)
        this.component.loadNXTAddresses(this)
        this.component.loadARDORAddresses(this)
        this.component.loadIotaAddresses(this)
        this.component.loadLtcAddresses(this)
        this.component.loadBitcoinCashAddresses(this)
      }
    }

    private createEntries(currencyName: string, walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      let addressLoading = new CurrencyAddressLoading(currencyName)
      addressLoading.visible = this.expanded;
      addressLoading.walletAddresses = wallet;
      this.currencies.push(addressLoading);

      let currencyAddressCreate: CurrencyAddressCreate =
          <CurrencyAddressCreate><unknown> this.currencies.find(c => c['isCurrencyAddressCreate'] && c.name == currencyName)
      if (!currencyAddressCreate) {
        currencyAddressCreate = new wlt.CurrencyAddressCreate(currencyName, wallet, this)
        this.currencies.push(currencyAddressCreate)
      }
    }

    findAddressLoading(currencySymbol: string): wlt.CurrencyAddressLoading {
      let result = this.currencies
          .find(c => {
            let cal = <wlt.CurrencyAddressLoading>c
            return cal.isCurrencyAddressLoading && cal.currencySymbol == currencySymbol
          })
      return <wlt.CurrencyAddressLoading>result
    }

    findAddressCreate(currencySymbol: string): wlt.CurrencyAddressCreate {
      let result = this.currencies
          .find(c => {
            let cal = <wlt.CurrencyAddressCreate>c
            return cal.isCurrencyAddressCreate && cal.currencySymbol == currencySymbol
          })
      return <wlt.CurrencyAddressCreate>result
    }

    getCryptoAddresses(currencySymbol: string): WalletAddresses {
      return this.findAddressLoading(currencySymbol)?.walletAddresses || this.findAddressCreate(currencySymbol)?.walletAddresses
    }

    initBTC(walletComponent: WalletComponentAbstract, wallet: WalletAddresses, user: UserService) {
      this.createEntries('Bitcoin', walletComponent, wallet)

      walletComponent.flatten()

      if (user.account === this.account) {
        walletComponent.shareCurrencyAddressesWithP2pContacts('BTC', wallet.addresses[0].address)
      }

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadBitcoinAddresses(this)
      }
    }

    initEth(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('Ethereum', walletComponent, wallet)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadEthereumAddresses(this)
      }
    }

    initIota(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('Iota', walletComponent, wallet)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadIotaAddresses(this)
      }
    }

    initFIMK(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('FIMK', walletComponent, wallet)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadFIMKAddresses(this)
      }
    }

    initNXT(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('NXT', walletComponent, wallet)

      if (this.expanded) {
        walletComponent.loadNXTAddresses(this)
      }
    }

    initARDOR(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('ARDOR', walletComponent, wallet)

      if (this.expanded) {
        walletComponent.loadARDORAddresses(this)
      }
    }

    initLTC(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('Litecoin', walletComponent, wallet)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadLtcAddresses(this)
      }
    }

    initBCH(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
      this.createEntries('BitcoinCash', walletComponent, wallet)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadBitcoinCashAddresses(this)
      }
    }

    applyFilter(walletFilter: WalletFilter) {
      this.filtered = this.name.indexOf(walletFilter.tmp) > -1 || this.account.indexOf(walletFilter.tmp) > -1
    }

  }

}
