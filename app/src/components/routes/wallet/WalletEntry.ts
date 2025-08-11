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

  export abstract class EntryAbstract {
    public visible = false
    /**
     * if not null the filter is enabled
     */
    public filtered = null
    public hidden = false
    public visibleLabel: string

    displayed() {
      return this.visible && !this.hidden && this.filtered != false
    }
  }

  export abstract class SubEntryAbstract extends EntryAbstract {

    public walletEntry: WalletEntry

    displayed() {
      return super.displayed() && this.walletEntry.displayed()
    }

  }

  export class TokenBalance extends SubEntryAbstract {
    public isTokenBalance = true
    public balance: string

    constructor(public walletEntry: WalletEntry, public name: string, public symbol: string, public address: string) {
      super()
    }
  }

  export class CurrencyBalance extends SubEntryAbstract {

    static hasNoZeroDigit = /[1-9]/  // test is string (balance) has any not zero digit (is balance no zero)
    static hasDigit = /[0-9]/  // test is string (balance) has any not zero digit (is balance no zero)
    public isCurrencyBalance = true
    public inUse = false
    public pubKey: string
    public tokens: Array<TokenBalance> = []
    public stateMessage: string
    private _balance: string

    constructor(walletEntry: WalletEntry, public name: string, public symbol: string, public address: string, public secretPhrase: string, public index?: number) {
      super()
      this.walletEntry = walletEntry
      this.visibleLabel = wlt.getEntryVisibleLabel(this.walletEntry.account, address)
    }

    toString(): string {
      return `${this.index ? '#' + this.index : ''} ${this.name}`
    }

    get balance(): string {
      let result
      if (this.isCurrencyBalance && this.symbol) {
        let r = getSavedCurrencyBalance(this.address, this.symbol, this._balance)
        result = r?.confirmed
      } else {
        result = this._balance
      }
      return CURRENCIES_MAP.get(this.name).formatBalance(result)
    }

    set balance(value: string) {
      this._balance = value;
    }

    public unlock(noPathChange?: boolean) {
      let user = <UserService>heat.$inject.get('user')
      let $location = <angular.ILocationService>heat.$inject.get('$location')
      let lightwalletService = <LightwalletService>heat.$inject.get('lightwalletService')
      let bip44Compatible = lightwalletService.validSeed(this.secretPhrase)

      /* Create the ICurrency based on the currency type */
      let currency: ICurrency = null
      if (this.name == 'Ethereum') {
        currency = new ETHCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'Bitcoin') {
        currency = new BTCCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'FIMK') {
        currency = new FIMKCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'NXT') {
        currency = new NXTCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'Iota') {
        currency = new IOTACurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'ARDOR') {
        currency = new ARDRCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'Litecoin') {
        currency = new LTCCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else if (this.name == 'BitcoinCash') {
        currency = new BCHCurrency(this.walletEntry.secretPhrase, this.secretPhrase, this.address)
      } else {
        currency = new HEATCurrency(
            this.walletEntry ? this.walletEntry.secretPhrase : this.secretPhrase,
            this.secretPhrase,
            this.address
        )
      }
      user.unlock(this.secretPhrase, null, bip44Compatible, currency).then(
          () => {
            if (!noPathChange) {
              $location.path(currency.homePath)
              heat.fullApplicationScopeReload()
            }
          }
      )
    }

    public isZeroBalance() {
      return !CurrencyBalance.hasNoZeroDigit.test(this._balance)
    }

    public hasDigit() {
      return CurrencyBalance.hasDigit.test(this._balance)
    }

  }

  export class CurrencyAddressLoading extends SubEntryAbstract {
    public isCurrencyAddressLoading = true
    public walletAddresses: WalletAddresses
    public address: string
    public currencySymbol: string

    constructor(public name: string, public walletEntry: WalletEntry) {
      super()
      this.currencySymbol = CURRENCIES_MAP.get(name)?.symbol
    }
  }

  export class CurrencyAddressCreate extends SubEntryAbstract {
    public isCurrencyAddressCreate = true
    public hidden = true
    public currencySymbol: string

    public flatten: () => void

    constructor(public name: string, public walletAddresses: WalletAddresses, public walletEntry: WalletEntry) {
      super()
      this.currencySymbol = CURRENCIES_MAP.get(name)?.symbol
      isLimitReached(getCurrencyBalances(this.walletEntry, this.name))
    }

    private getCurrencies(account: string): string[] {
      let currencies = getStore().get(account)
      return currencies || []
    }

    private registerCurrency(account: string, currency: string) {
      let currencies = this.getCurrencies(account)
      if (currencies.indexOf(currency) > -1) return
      currencies.push(currency)
      getStore().put(account, currencies.filter(wlt.distinctValues))
    }

    removeIsDeleted(entry) {
      let currencySymbol = entry.symbol
      let account = entry.walletEntry.account
      let walletType = getCryptoAddresses(entry.walletEntry, currencySymbol)
      walletType.addresses.forEach(walletAddress => {
        if (walletAddress.address === entry.address)
          delete walletAddress['isDeleted']
      })
      saveCryptoAddresses(entry.walletEntry, currencySymbol, walletType)
    }

    createAddressByName() {
      let walletEntry = this.findWalletEntry(this)
      if (this.name == "Bitcoin") return this.createBtcAddress(walletEntry)
      if (this.name == "Ethereum") return this.createEthAddress(walletEntry)
      if (this.name == "FIMK") return this.createFIMKAddress(walletEntry)
      if (this.name == "NXT") return this.createNXTAddress(walletEntry)
      if (this.name == "ARDOR") return this.createARDRAddress(walletEntry)
      if (this.name == "Litecoin") return this.createLtcAddress(walletEntry)
      if (this.name == "BitcoinCash") return this.createBchAddress(walletEntry)
    }

    findWalletEntry(entry) {
      while (entry && !entry.isWalletEntry) {
        entry = entry.walletEntry || entry.parent
      }
      return entry?.isWalletEntry ? entry : null
    }

    findNextAddress(currencySymbol, addresses: WalletAddresses, lastAddress: string, component: WalletComponentAbstract, walletEntry: WalletEntry): WalletAddress {
      let i = lastAddress
          ? addresses.addresses.findIndex(value => value.address == lastAddress) + 1
          : 0
      if (i < addresses.addresses.length) {
        let nextAddress = addresses.addresses[i]
        if (nextAddress.isDeleted) {
          nextAddress.isDeleted = false
          saveCryptoAddresses(walletEntry, currencySymbol, addresses)
        }
        return nextAddress
      }
      return null
    }

    /* Handler for creating a new address, this method is declared here (on the node so to say)
      still after an architectural change where we dont display the CREATE node anymore.
      We'll be leaving it in place where all you need to do is set this.hidden=false to
      have it displayed again. */
    createEthAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'Ethereum', 'ETH')
    }

    createBtcAddress(entry: WalletEntry) {
      return BTCCurrency.requestBtcAddressType(entry, 'Bitcoin')
          .then(wa => this.createAddress(entry, 'Bitcoin', 'BTC', wa))
    }

    createLtcAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'Litecoin', 'LTC')
    }

    createBchAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'BitcoinCash', 'BCH')
    }

    createFIMKAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'FIMK', 'FIM')
    }

    createNXTAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'NXT', 'NXT')
    }

    createARDRAddress(entry: WalletEntry) {
      return this.createAddress(entry, 'ARDOR', 'ARDR')
    }

    createAddress(entry: WalletEntry, currencyName: string, currencySymbol: string, candidateAddress?: WalletAddress) {
      let component: WalletComponentAbstract = entry.component
      let currencies = this.walletEntry.currencies

      if (candidateAddress?.index != undefined) {
        this.walletAddresses.addresses[candidateAddress.index] = candidateAddress
      }

      // collect all CurrencyBalance of 'our' same currency type
      // @ts-ignore
      let currencyBalances = getCurrencyBalances(this.walletEntry, this.name)

      if (isLimitReached(currencyBalances)) {
        component.showMessage("Limit of empty addresses is reached")
        return
      }

      // determine the first address based of the last currencyBalance displayed
      let lastAddress = currencyBalances.length == 0
          ? null
          : currencyBalances[currencyBalances.length - 1].address

      let nextAddress = candidateAddress || this.findNextAddress(currencySymbol, this.walletAddresses, lastAddress, component, entry)

      if (nextAddress) {
        nextAddress.isDeleted = false
        rememberCryptoAddressCreated(this.walletEntry, currencySymbol, nextAddress)
        let newCurrencyBalance = new CurrencyBalance(this.walletEntry, currencyName, currencySymbol, nextAddress.address, nextAddress.privateKey, nextAddress.index)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        //rememberAddressCreated(this.walletEntry.account, nextAddress.address)
        newCurrencyBalance.visible = this.walletEntry.expanded
        //let index = currencies.indexOf(currencyBalances[currencyBalances.length - 1]) + 1
        //currencies.splice(index, 0, newCurrencyBalance)

        let currencyAddressCreate: CurrencyAddressCreate =
            <CurrencyAddressCreate><unknown> currencies.find(c => c['isCurrencyAddressCreate'] && c.name == this.name)
        let index = currencyAddressCreate
            ? currencies.indexOf(currencyAddressCreate)
            : currencies.indexOf(currencyBalances[currencyBalances.length - 1])
        index = index == -1 ? currencies.length - 1 : index
        currencies.splice(index, 0, newCurrencyBalance)
        //currencies.push(newCurrencyBalance)

        this.registerCurrency(this.walletEntry.account, currencySymbol)

        component.flatten()

        /*
        // requestBalance(currencyName)
        if (currencyName == "Ethereum") {
          let ethCurrencyAddressLoading = new CurrencyAddressLoading('Ethereum')
          ethCurrencyAddressLoading.visible = entry.visible
          ethCurrencyAddressLoading.wallet = this.wallet
          currencies.push(ethCurrencyAddressLoading)
          component.loadEthereumAddresses(this.walletEntry)
        }
        setTimeout(() => this.flatten(), 1000)
         */

        shouldBeSaved = component.exportWallet(true)

        return newCurrencyBalance
      }
    }

    // private requestBalance(currencyName) {
    //
    //   if (currencyName == "Ethereum") {
    //     let lightwalletService = <LightwalletService>heat.$inject.get('lightwalletService')
    //     lightwalletService.refreshBalances()
    //   }
    //
    // }

  }

  export class WalletEntry extends wlt.EntryAbstract {
    public isWalletEntry = true
    public selected = true
    public identifier: string
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

    findCurrencyBalance(currencySymbol: string): wlt.CurrencyBalance {
      let result = this.currencies
          .find(c => {
            let cal = <wlt.CurrencyBalance>c
            return cal.isCurrencyBalance && cal.symbol == currencySymbol
          })
      return <wlt.CurrencyBalance>result
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
        if (!item) return
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

    findInTransactions = (find, queryTokens, currency, a) => {
      let isFind = false
      let page = 0
      let store = wlt.getStore('currency-cache-' + currency.symbol.toLowerCase())
      while (page < 100500) {
        let txsPage: any[] = store.get(a.address + '-' + page)
        if (!txsPage) break
        for (const tx of txsPage) {
          //find tx id
          let txId = tx.hash || tx.txid
          let detection = find(`Transaction ${currency.name} #${typeof a.index === "number" ? a.index : ''}`, txId)
          if (detection) {
            isFind = true
            queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
          }
          //find payment memo
          let localPaymentMessages: {method: number, text: string} = tx.message
          if (localPaymentMessages?.text) {
            detection = find(`Payment memo ${currency.name} #${typeof a.index === "number" ? a.index : ''}`, localPaymentMessages.text)
            if (detection) {
              isFind = true
              queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }
          }
        }
        page++
      }
      if (queryTokens == null) return isFind  //for applying OR operator
      return queryTokens  //for applying AND operator
    }

    applyFilter(walletFilter: WalletFilter, logicalOperator: 'and' | 'or') {
      let registry = this.trackFinds(walletFilter)
      if (logicalOperator == "or") this.applyFilterOr(walletFilter, registry)
      if (logicalOperator == "and") this.applyFilterAnd(walletFilter, registry)
      if (registry.finds.size > 0) {
        //console.log(this.account, this.filtered, registry.finds)
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

      // find currency addresses labels
      let labels = wlt.getEntryVisibleLabelList(this.account)
      for (let label of labels) {
        if (find(`${this.account} address label`, label)) {
          this.filtered = true
          return
        }
      }

      //this.selectedCurrencies = wlt.getStore().get(this.account) || []
      if (this.selectedCurrencies.length > 0) {
        for (let currencySymbol of this.selectedCurrencies) {
          let c = wlt.SYM_CURRENCIES_MAP.get(currencySymbol)
          if (find('currency', currencySymbol, true) || find('currency', c.name)) {
            this.filtered = true
            return
          }
          let addresses = this.getCryptoAddresses(currencySymbol)?.addresses
          if (addresses) {
            for (let a of addresses) {
              if (find(`${c.name} #${typeof a.index === "number" ? a.index : ''}`, a.address)) {
                this.filtered = true
                return
              }
              // search in cached transactions
              if (this.findInTransactions(find, null, c, a)) {
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

      let queryTokens = Array.from(walletFilter.queryTokens)

      let detection = find('account', this.account)
          || find('account name', this.name)
          || find('account label', this.visibleLabel)
          || find('account private label', this.label)

      if (detection)  queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())

      // find currency address label
      let findCurrencyAddressLabel = (account: string) => {
        let labels = wlt.getEntryVisibleLabelList(account)
        for (let label of labels) {
          detection = find(`${this.account} address label`, label)
          if (detection) {
            queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
          }
        }
      }

      findCurrencyAddressLabel(this.account)

      let currencySymbolDetected = false
      let entryCurrencySymbols: string[] = wlt.getStore().get(this.account)

      if (entryCurrencySymbols?.length > 0) {

        const findAddresses = (currencySymbol) => {
          if (!this.secretPhrase) return
          let c = wlt.SYM_CURRENCIES_MAP.get(currencySymbol)
          for (let a of (this.getCryptoAddresses(currencySymbol)?.addresses || [])) {
            detection = find(`${c.name} #${typeof a.index === "number" ? a.index : ''}`, a.address)
            if (detection) {
              queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }

            // search in cached transactions
            queryTokens = this.findInTransactions(find, queryTokens, c, a)
          }
        }

        for (let c of entryCurrencySymbols) {
          let currencyName = wlt.SYM_CURRENCIES_MAP.get(c).name
          detection = find('currency', c, true) || find('currency', currencyName)
          if (detection) {
            currencySymbolDetected = true
            queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            findAddresses(c)
          }
        }
        // no any currency symbol in query, so search addresses not grouped by currency
        if (!currencySymbolDetected) {
          for (let c of entryCurrencySymbols) {
            findAddresses(c)
          }
        }
      }

      if (queryTokens.length == 0) {
        this.filtered = true
        return
      }
    }

    toString(): string {
      return `${this.account} ${this.name || ''}`
    }

  }

}
