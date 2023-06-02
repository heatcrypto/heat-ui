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

  const DISPLAYED_MAX_EMPTY_ADDRESSES = 5


  let distinctValues = (value, index, self) => {
    return self.indexOf(value) === index
  }

  export function getStore() {
    let storage = <StorageService>heat.$inject.get('storage')
    let $rootScope = heat.$inject.get('$rootScope')
    return storage.namespace('wallet', $rootScope, true)
  }

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

    constructor(public name: string) {
    }
  }

  export class CurrencyAddressCreate {
    public isCurrencyAddressCreate = true
    public visible = false
    public hidden = false
    public flatten: () => void

    constructor(public name: string, public wallet: WalletAddresses, public walletEntry: WalletEntry, public component?: WalletComponentAbstract) {
      this.walletEntry = walletEntry
      this.visible = walletEntry.expanded
      this.isLimitReached(null)
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
      const storage = <StorageService>heat.$inject.get('storage')
      const $rootScope = heat.$inject.get('$rootScope')
      let currency = entry.symbol
      let heatAddress = entry.walletEntry.account
      let store = storage.namespace('wallet-address', $rootScope, true)
      let encryptedWallet = store.get(`${currency}-${heatAddress}`)
      let decryptedWallet = heat.crypto.decryptMessage(encryptedWallet.data, encryptedWallet.nonce, heatAddress, entry.walletEntry.secretPhrase)
      let walletType = JSON.parse(decryptedWallet)
      walletType.addresses.forEach(walletAddress => {
        if (walletAddress.address === entry.address)
          delete walletAddress['isDeleted']
      })
      let encrypted = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, entry.walletEntry.secretPhrase)
      store.put(`${currency}-${heatAddress}`, encrypted)
    }

    createAddressByName(entry) {
      if (entry.name == "Bitcoin") return this.createBtcAddress(entry)
      if (entry.name == "Ethereum") return this.createEthAddress(entry)
      if (entry.name == "FIMK") return this.createFIMKAddress(entry)
      if (entry.name == "NXT") return this.createNXTAddress(entry)
      if (entry.name == "ARDOR") return this.createARDRAddress(entry)
      if (entry.name == "Litecoin") return this.createLtcAddress(entry)
      if (entry.name == "BitcoinCash") return this.createBchAddress(entry)
    }

    findWalletEntry(entry) {
      while (entry && !entry.isWalletEntry) {
        entry = entry.parent || entry.walletEntry
      }
      return entry?.isWalletEntry ? entry : null
    }

    findNextAddress(currencyName, addresses: Array<WalletAddress>, lastAddress: string, component: WalletComponentAbstract, entry): WalletAddress {
      let walletEntry = this.findWalletEntry(entry)
      let i = lastAddress
          ? addresses.findIndex(value => value.address == lastAddress) + 1
          : 0
      if (i < addresses.length) {
        let nextAddress = this.wallet.addresses[i]
        if (component.wasRemoved(nextAddress.address, walletEntry.account)) {
          component.forgetAddressesRemoved(walletEntry.account, currencyName, nextAddress.address)
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
      let component: WalletComponentAbstract = entry.component
      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.walletEntry.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('FIMK', 'FIM', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        component.rememberAddressCreated(this.walletEntry.account, nextAddress.address)
        newCurrencyBalance.visible = this.walletEntry.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.registerCurrency(this.walletEntry.account, 'FIM')
        return true
      }

      return false
    }

    createNXTAddress(entry: WalletEntry) {
      let component: WalletComponentAbstract = entry.component
      let currencyBalances = this.walletEntry.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('NXT', 'NXT', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        component.rememberAddressCreated(this.walletEntry.account, nextAddress.address)
        newCurrencyBalance.visible = this.walletEntry.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.registerCurrency(this.walletEntry.account, 'NXT')
        return true
      }
      return false
    }

    createARDRAddress(entry: WalletEntry) {
      let component: WalletComponentAbstract = entry.component
      let currencyBalances = this.walletEntry.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('ARDOR', 'ARDR', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        component.rememberAddressCreated(this.walletEntry.account, nextAddress.address)
        newCurrencyBalance.visible = this.walletEntry.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.registerCurrency(this.walletEntry.account, 'ARDR')
        return true
      }
      return false
    }

    createAddress(entry: WalletEntry, currencyName: string, currencySymbol: string) {
      let component: WalletComponentAbstract = entry.component
      let currencies = this.walletEntry.currencies

      // collect all CurrencyBalance of 'our' same currency type
      // @ts-ignore
      let currencyBalances: Array<CurrencyBalance> = currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      if (this.isLimitReached(currencyBalances)) return false

      // determine the first address based of the last currencyBalance displayed
      let lastAddress = currencyBalances.length == 0
          ? null
          : currencyBalances[currencyBalances.length - 1]['address']

      let nextAddress = this.findNextAddress(currencyName, this.wallet.addresses, lastAddress, component, entry)

      if (nextAddress) {
        let newCurrencyBalance = new CurrencyBalance(currencyName, currencySymbol, nextAddress.address, nextAddress.privateKey, nextAddress.index)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
        component.rememberAddressCreated(this.walletEntry.account, nextAddress.address)
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

        return true
      }

      return false
    }

    public isLimitReached(currencyBalances: Array<CurrencyBalance>) {
      if (!currencyBalances) {
        // @ts-ignore
        currencyBalances = this.walletEntry.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)
      }
      let emptyBalanceCounter = 0
      currencyBalances.forEach(
          (value) => {
            if (value.isZeroBalance()) emptyBalanceCounter++
          }
      )
      let b = emptyBalanceCounter >= DISPLAYED_MAX_EMPTY_ADDRESSES
      this.hidden = b
      return b
    }
  }

}
