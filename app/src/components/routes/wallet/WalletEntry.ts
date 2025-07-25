/*
 * The MIT License (MIT)
 * Copyright (c) 2016-2025 HEAT DEX.
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

  export type WalletSearchTracker = {
    /**
     * find items matching token
     */
    find: (name: string, item: string, exact?: boolean) => { token: string, item: string },
    /**
     * detailed info of finds (where it were found)
     */
    finds: Map<string, string[]>
  }

  export class WalletEntry extends EntryAbstract {
    public isWalletEntry = true
    public selected = true
    public identifier: string
    public visibleLabel: string
    public label: string
    public secretPhrase: string
    public selectedCurrencies: string[]
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
      this.selectedCurrencies = (wlt.getStore().get(this.account) || []).sort()
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
      let addressLoading = new CurrencyAddressLoading(currencyName, this)
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

    trackFinds = (walletFilter: WalletFilter) => {
      let finds = new Map<string, string[]>()

      let find = (name: string, item: string, exact = false) => {
        let detection = walletFilter.test(item, exact)
        if (!detection) return
        let key = `[${name}] ${detection.token}`
        let v = finds.get(key) || []
        v.push(detection.item)
        finds.set(key, v)
        return detection
      }

      return {find, finds}
    }

    applyFilter(walletFilter: WalletFilter, logicalOperator: 'and' | 'or') {
      let registry = this.trackFinds(walletFilter)
      if (logicalOperator == "or") this.applyFilterOr(walletFilter, registry)
      if (logicalOperator == "and") this.applyFilterAnd(walletFilter, registry)
      if (registry.finds.size > 0) {
        console.log(this.account, this.filtered, registry.finds)
        return registry.finds
      }
    }

    private applyFilterOr(walletFilter: wlt.WalletFilter, registry: wlt.WalletSearchTracker) {
      let find = registry.find
      this.filtered = false
      if (find('account', this.account)
          || find('account name', this.name)
          || find('account label', this.visibleLabel)
          || find('account private label', this.label)) {
        this.filtered = true
        return
      }

      //this.selectedCurrencies = wlt.getStore().get(this.account) || []
      if (this.selectedCurrencies.length > 0) {
        //const intersection = wlt.CURRENCY_SYMBOLS.filter(item => entryCurrencies.includes(item));
        for (let c of this.selectedCurrencies) {
          if (find('currency', c, true)) {
            this.filtered = true
            return
          }
          let addresses = this.getCryptoAddresses(c)?.addresses
          if (addresses) {
            for (let a of addresses) {
              if (find('address ' + c, a.address)) {
                this.filtered = true
                return
              }
            }
          }
        }
      }
    }

    private applyFilterAnd(walletFilter: wlt.WalletFilter, walletSearchRegister: wlt.WalletSearchTracker) {
      let find = walletSearchRegister.find
      this.filtered = false

      let tokens = Array.from(walletFilter.queryTokensUpperCase)

      let detection = find('account', this.account)
          || find('account name', this.name)
          || find('account label', this.visibleLabel)
          || find('account private label', this.label)

      if (detection)  tokens = tokens.filter(v => v != detection.token)

      let currencySymbolDetected = false
      let entryCurrencySymbols: string[] = wlt.getStore().get(this.account)
      if (entryCurrencySymbols?.length > 0) {
        for (let c of entryCurrencySymbols) {
          detection = find('currency', c, true)
          if (detection) {
            currencySymbolDetected = true
            tokens = tokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            let addresses = this.getCryptoAddresses(c)?.addresses
            if (addresses) {
              for (let a of addresses) {
                detection = find('address', a.address)
                if (detection) {
                  tokens = tokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
                }
              }
            }
          }
        }
        // no any currency symbol in query, so search addresses not grouped by currency
        if (!currencySymbolDetected) {
          for (let c of entryCurrencySymbols) {
            for (let a of (this.getCryptoAddresses(c)?.addresses || [])) {
              detection = find('address', a.address)
              if (detection) {
                tokens = tokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
              }
            }
          }
        }
      }

      if (tokens.length == 0) this.filtered = true
    }

  }

}
