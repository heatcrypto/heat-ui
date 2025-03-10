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

  const defaultFormatBalance = balance => { return balance  }

  export const CURRENCIES = {
    HEAT: {name: 'HEAT', symbol: 'HEAT', multiAddress: true, formatBalance: defaultFormatBalance},
    Ethereum: {name: 'Ethereum', symbol: 'ETH', multiAddress: true, formatBalance: defaultFormatBalance},
    Bitcoin: {name: 'Bitcoin', symbol: 'BTC', multiAddress: true, formatBalance: defaultFormatBalance},
    FIMK: {name: 'FIMK', symbol: 'FIM', multiAddress: false, formatBalance: defaultFormatBalance},
    NXT: {name: 'NXT', symbol: 'NXT', multiAddress: false, formatBalance: defaultFormatBalance},
    ARDOR: {name: 'ARDOR', symbol: 'ARDR', multiAddress: false, formatBalance: defaultFormatBalance},
    IOTA: {name: 'IOTA', symbol: 'IOTA', multiAddress: false, formatBalance: defaultFormatBalance},
    Litecoin: {name: 'Litecoin', symbol: 'LTC', multiAddress: true, formatBalance: defaultFormatBalance},
    BitcoinCash: {name: 'BitcoinCash', symbol: 'BCH', multiAddress: true, formatBalance: defaultFormatBalance}
  }

  CURRENCIES.Bitcoin.formatBalance = balance => {
    if (balance) return new Big(balance).div(wlt.SATOSHI_PER_BTC).toString()
    return balance
  }

  export const CURRENCIES_LIST = Object.keys(CURRENCIES).map(k => CURRENCIES[k])

  export const CURRENCIES_MAP: Map<String, {name: string, symbol: string, multiAddress: boolean, formatBalance: (string) => string}> = new Map(Object.entries(CURRENCIES))

  export const DISPLAYED_MAX_EMPTY_ADDRESSES = 4

  export let createdAddresses: { [key: string]: Map<string, string> } = {}

  export let shouldBeSaved: Blob

  export const HASH_PREFIX = "XYZ"

  export const SATOSHI_PER_BTC = new Big(100000000)

  const storageMap = new Map<string, Store>()

  const UNCONFIRMED_CURRENCY_BALANCE_LIFETIME = 3000 * 60 // 3 minutes

  window.addEventListener("beforeunload", function (e) {
    if (shouldBeSaved) {
      try {
        saveFile(shouldBeSaved)
      } catch (e) {
        console.error(e)
      }
      e.returnValue = "\o/"
    }
  })

  let distinctValues = (value, index, self) => {
    return self.indexOf(value) === index
  }

  export function getStore(namespace = "wallet") {
    let store = storageMap.get(namespace)
    if (store) return store
    let storage = <StorageService>heat.$inject.get('storage')
    let $rootScope = heat.$inject.get('$rootScope')
    store = storage.namespace(namespace, $rootScope, true)
    storageMap.set(namespace, store)
    return store
  }

  export function saveCurrencyBalance(address: string, currencySymbol: string, balance: string, unconfirmedBalance?: string) {
    let hash = heat.crypto.hash(address).substring(0, 16)
    let key = `balance-${currencySymbol}-${hash}`
    let r = getStore().get(key)
    if (r) {
      r.b = balance
      if (unconfirmedBalance) {
        r.ub = unconfirmedBalance
        r.t = Date.now()
      }
      getStore().put(key, r)
    } else {
      getStore().put(key, {b: balance, ub: unconfirmedBalance, t: Date.now()})
    }
  }

  /**
   * Returns 2 Big values: 1) confirmed balance, 2) (optional) unconfirmed balance
   */
  export function getSavedCurrencyBalance(address: string, currencySymbol: string, balance?: string): {confirmed: string, unconfirmed?: string} {
    let hash = heat.crypto.hash(address).substring(0, 16)
    let key = `balance-${currencySymbol}-${hash}`
    let r = getStore().get(key)
    if (r) {
      if (r.ub && r.t + UNCONFIRMED_CURRENCY_BALANCE_LIFETIME < Date.now()) {
        return {confirmed: r.b}
      }
      return {confirmed: r.b, unconfirmed: r.ub}
    }
    return {confirmed: balance}
  }

  /*
    export function getVersion(): number {
      return parseInt(getStore().get("version", "0"))
    }
  */

  export function getEntryVisibleLabel(account) {
    return getStore().get("label." + account)
  }

  export function updateEntryVisibleLabel(account, visibleLabel) {
    let storeKey = "label." + account
    if (visibleLabel) {
      getStore().put(storeKey, visibleLabel)
    } else {
      getStore().remove(storeKey)
    }
  }

  export function updateEntryCurrencies(account, currencies: []) {
    if (currencies) {
      let mergedCurrencies: [] = getStore().get(account) || []
      mergedCurrencies.push(...currencies)
      getStore().put(account, mergedCurrencies.filter(distinctValues))
    }
  }

  export function initCreatedAddresses() {
    let removingKeys = []
    let addingItems = []
    let addingValues = []
    createdAddresses = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      let origKey = window.localStorage.key(i)
      // old format "eth-address-created:..." is used for backward compatibility
      if (origKey.startsWith("addresscreated-") || origKey.startsWith("eth-address-created")) {
        let key = tryClearKey(origKey, removingKeys, addingValues)
        let s = key.substring(key.indexOf("-") + 1)
        let acc = s.substring(0, s.indexOf("-"))
        let addr = s.substring(s.indexOf("-") + 1)
        let addresses = createdAddresses[acc] || new Map<string, string>()
        let value = window.localStorage.getItem(key)
        let balance = value?.startsWith("balance") ? value.substring(7) : ""
        let addrHash = addr.startsWith(HASH_PREFIX) ? addr : null
        if (!addrHash) {
          addrHash = HASH_PREFIX + heat.crypto.hash(addr)
          addingItems.push([acc, addrHash, balance]) // now saved in actual format, so old one can be removed
          removingKeys.push(origKey)
        }
        addresses.set(addrHash, balance)
        createdAddresses[acc] = addresses
      }
    }
    for (const key of removingKeys) {
      let v = window.localStorage.getItem(key)
      window.localStorage.setItem("[obsolete]" + key, v)
      window.localStorage.removeItem(key)
    }
    for (const item of addingItems) {
      rememberAddressCreated(item[0], item[1], item[2])
    }
    for (const item of addingValues) {
      window.localStorage.setItem(item[0], item[1])
    }
  }

  /* in old versions the key format was changed several times, must be brought to the actual format
  */
  function tryClearKey(key: string, removingKeys, addingValues) {
    if (key.indexOf(HASH_PREFIX) > -1) return key
    let s = key.replace("eth-address-created", "addresscreated")
    s = s.replace("address-created:", "")
    s = s.replace(":", "-")
    s = s.replace("bitcoincash-", "bitcoincash:")
    let i = s.indexOf(",")
    if (i > -1) s = s.substring(0, i)
    if (key != s) {
      let value = window.localStorage.getItem(key)
      addingValues.push([s, value])
      removingKeys.push(key)
    }
    return s
  }

  export function rememberCryptoAddressCreated(walletEntry: WalletEntry, currencySymbol: string, createdAddress: WalletAddress): WalletAddress  {
    let cryptoAddresses = getCryptoAddresses(walletEntry, currencySymbol)
    if (!cryptoAddresses) return null
    let foundAddress = cryptoAddresses.addresses.find(a => a.address == createdAddress.address)
    if (!foundAddress) {
      foundAddress = cryptoAddresses.addresses.find((a) => a.index == createdAddress.index)
      if (foundAddress) {
        let i = cryptoAddresses.addresses.indexOf(foundAddress)
        cryptoAddresses.addresses[i] = createdAddress
        foundAddress = createdAddress
      }
    }
    foundAddress.isDeleted = false
    foundAddress.created = true
    saveCryptoAddresses(walletEntry, currencySymbol, cryptoAddresses)
    return foundAddress
  }

  export function rememberAddressCreated(account: string, addressHash: string, balance?: string) {
    createdAddresses[account] = createdAddresses[account] || new Map<string, string>()
    createdAddresses[account].set(addressHash, balance || "")
    window.localStorage.setItem(`addresscreated-${account}-${addressHash}`, balance ? "balance" + balance : "1")
  }

  export function getCurrencyBalances(walletEntry: WalletEntry, currencyName: string): Array<CurrencyBalance> {
    // @ts-ignore
    return walletEntry.currencies.filter(c => c['isCurrencyBalance'] && c.name == currencyName)
  }

  export function isLimitReached(currencyBalances: Array<CurrencyBalance>) {
    let emptyBalanceCounter = 0
    currencyBalances.forEach(
        (value) => {
          if (value.isZeroBalance()) emptyBalanceCounter++
        }
    )
    //let b = emptyBalanceCounter >= DISPLAYED_MAX_EMPTY_ADDRESSES
    //this.hidden = b
    return emptyBalanceCounter >= DISPLAYED_MAX_EMPTY_ADDRESSES
  }



  export class TokenBalance {
    public isTokenBalance = true
    public balance: string
    public visible = false

    constructor(public name: string, public symbol: string, public address: string) {
    }
  }


  export class CurrencyBalance {

    static hasNoZeroDigit = /[1-9]/  // test is string (balance) has any not zero digit (is balance no zero)
    static hasDigit = /[0-9]/  // test is string (balance) has any not zero digit (is balance no zero)

    public isCurrencyBalance = true
    public inUse = false
    public pubKey: string
    public tokens: Array<TokenBalance> = []
    public visible = false
    public hidden = false
    public stateMessage: string
    walletEntry: WalletEntry
    private _balance: string

    constructor(public name: string, public symbol: string, public address: string, public secretPhrase: string, public index?: number) {
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

  export class CurrencyAddressLoading {
    public isCurrencyAddressLoading = true
    public visible = false
    public walletAddresses: WalletAddresses
    public address: string
    public currencySymbol: string

    constructor(public name: string) {
      this.currencySymbol = CURRENCIES_MAP.get(name)?.symbol
    }
  }

  export class CurrencyAddressCreate {
    public isCurrencyAddressCreate = true
    public visible = false
    public hidden = true
    public currencySymbol: string

    public flatten: () => void

    constructor(public name: string, public walletAddresses: WalletAddresses, public walletEntry: WalletEntry) {
      this.walletEntry = walletEntry
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
      getStore().put(account, currencies.filter(distinctValues))
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
        let newCurrencyBalance = new CurrencyBalance(currencyName, currencySymbol, nextAddress.address, nextAddress.privateKey, nextAddress.index)
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

  export function getCryptoAddresses(walletEntry: WalletEntry, currencySymbol: string) {
    return walletEntry.getCryptoAddresses(currencySymbol) || loadCryptoAddresses(walletEntry, currencySymbol)
  }

  export function loadCryptoAddresses(walletEntry: WalletEntry, currencySymbol: string) {
    let record = getStore('wallet-address').get(`${currencySymbol}-${walletEntry.account}`)
    if (record && record.data) {
      let decrypted = heat.crypto.decryptMessage(record.data, record.nonce, walletEntry.account, walletEntry.secretPhrase)
      let result: WalletAddresses = JSON.parse(decrypted)
      return result
    }
  }

  export function saveCryptoAddresses(walletEntry: wlt.WalletEntry, currencySymbol: string, addresses: WalletAddresses) {
    let encrypted = heat.crypto.encryptMessage(JSON.stringify(addresses), walletEntry.account, walletEntry.secretPhrase)
    getStore('wallet-address').put(`${currencySymbol}-${walletEntry.account}`, encrypted)
  }

  export function saveFile(blob: Blob, fileName?: string) {
    if (fileName) {
      saveAs(blob, fileName)
    } else {
      let version = parseInt(getStore().get("fileVersion")) || 0
      version++
      if (version > 99) version = 1
      saveAs(blob, `heat.backup.v${version}.wallet`)
      getStore().put("fileVersion", version)
    }
    shouldBeSaved = null
  }

}
