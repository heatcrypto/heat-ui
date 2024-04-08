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

  export const CURRENCIES = {
    HEAT: {name: 'HEAT', symbol: 'HEAT', multiAddress: true},
    Ethereum: {name: 'Ethereum', symbol: 'ETH', multiAddress: true},
    Bitcoin: {name: 'Bitcoin', symbol: 'BTC', multiAddress: true},
    FIMK: {name: 'FIMK', symbol: 'FIM', multiAddress: false},
    NXT: {name: 'NXT', symbol: 'NXT', multiAddress: false},
    ARDOR: {name: 'ARDOR', symbol: 'ARDR', multiAddress: false},
    IOTA: {name: 'IOTA', symbol: 'IOTA', multiAddress: false},
    Litecoin: {name: 'Litecoin', symbol: 'LTC', multiAddress: true},
    BitcoinCash: {name: 'BitcoinCash', symbol: 'BCH', multiAddress: true}
  }

  export const CURRENCIES_LIST = Object.keys(CURRENCIES).map(k => CURRENCIES[k])

  export const CURRENCIES_MAP: Map<String, {name: string, symbol: string, multiAddress: boolean}> = new Map(Object.entries(CURRENCIES))

  export const DISPLAYED_MAX_EMPTY_ADDRESSES = 4

  export let createdAddresses: { [key: string]: Map<string, string> } = {}

  export let shouldBeSaved: Blob

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
    let storage = <StorageService>heat.$inject.get('storage')
    let $rootScope = heat.$inject.get('$rootScope')
    return storage.namespace(namespace, $rootScope, true)
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
    for (let i = 0; i < window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      // old format "eth-address-created:..." is used for backward compatibility
      let data = key.match(/addresscreated-(.+)-(.+)/) || key.match(/eth-address-created:(.+):(.+)/)
      if (data) {
        let s = key.substring(key.indexOf("-") + 1)
        let acc = s.substring(0, s.indexOf("-"))
        let addr = s.substring(s.indexOf("-") + 1)
        let addresses = createdAddresses[acc] || new Map<string, string>()
        let value = window.localStorage.getItem(key)
        let balance = value.startsWith("balance") ? value.substring(7) : ""
        addresses.set(addr, balance)
        createdAddresses[acc] = addresses
      }
    }
  }

  export function rememberCryptoAddressCreated(walletEntry: WalletEntry, currencySymbol: string, address: string): WalletAddress  {
    let cryptoAddresses = getCryptoAddresses(walletEntry, currencySymbol)
    if (!cryptoAddresses) return null
    let foundAddress = cryptoAddresses.addresses.find(a => a.address == address)
    if (!foundAddress) return null
    if (!foundAddress.created) {
      foundAddress.created = true
      saveCryptoAddresses(walletEntry, currencySymbol, cryptoAddresses)
    }
    return foundAddress
  }

  export function rememberAddressCreated(account: string, address: string, balance?: string) {
    createdAddresses[account] = createdAddresses[account] || new Map<string, string>()
    createdAddresses[account].set(address, balance || "")
    window.localStorage.setItem(`addresscreated-${account}-${address}`, balance ? "balance" + balance : "1")
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

    static hasDigit = /[1-9]/  // test is string (balance) has any not zero digit (is balance no zero)

    public isCurrencyBalance = true
    public balance: string
    public inUse = false
    public tokens: Array<TokenBalance> = []
    public visible = false
    public hidden = false
    public stateMessage: string
    walletEntry: WalletEntry

    constructor(public name: string, public symbol: string, public address: string, public secretPhrase: string, public index?: number) {
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
      return !CurrencyBalance.hasDigit.test(this.balance)
    }

  }

  export class CurrencyAddressLoading {
    public isCurrencyAddressLoading = true
    public visible = false
    public wallet: WalletAddresses
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

    constructor(public name: string, public wallet: WalletAddresses, public walletEntry: WalletEntry, public component?: WalletComponentAbstract) {
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
      return this.createAddress(entry, 'Bitcoin', 'BTC')
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

    createAddress(entry: WalletEntry, currencyName: string, currencySymbol: string) {
      let component: WalletComponentAbstract = entry.component
      let currencies = this.walletEntry.currencies

      // collect all CurrencyBalance of 'our' same currency type
      // @ts-ignore
      let currencyBalances = getCurrencyBalances(this.walletEntry, this.name)

      if (isLimitReached(currencyBalances)) {
        component.showMessage("Limit of empty addresses is reached")
        return false
      }

      // determine the first address based of the last currencyBalance displayed
      let lastAddress = currencyBalances.length == 0
          ? null
          : currencyBalances[currencyBalances.length - 1]['address']

      let nextAddress = this.findNextAddress(currencySymbol, this.wallet, lastAddress, component, entry)

      if (nextAddress) {
        nextAddress.isDeleted = false
        let newCurrencyBalance = new CurrencyBalance(currencyName, currencySymbol, nextAddress.address, nextAddress.privateKey, nextAddress.index)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        rememberAddressCreated(this.walletEntry.account, nextAddress.address)
        rememberCryptoAddressCreated(this.walletEntry, currencySymbol, nextAddress.address)
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

        this.flatten()

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

        return true
      }

      return false
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
    let result: WalletAddresses = walletEntry.getCryptoAddresses(currencySymbol)
    if (result) return result
    let record = getStore('wallet-address').get(`${currencySymbol}-${walletEntry.account}`)
    let decrypted = heat.crypto.decryptMessage(record.data, record.nonce, walletEntry.account, walletEntry.secretPhrase)
    result = JSON.parse(decrypted)
    return result
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
