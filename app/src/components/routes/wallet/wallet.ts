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

  export class TokenBalance {
    public isTokenBalance = true
    public balance: string
    public visible = false

    constructor(public name: string, public symbol: string, public address: string) {
    }
  }

  export class CurrencyBalance {
    public isCurrencyBalance = true
    public balance: string
    public inUse = false
    public tokens: Array<TokenBalance> = []
    public visible = false
    walletEntry: WalletEntry

    constructor(public name: string, public symbol: string, public address: string, public secretPhrase: string) {
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
  }

  export class CurrencyAddressLoading {
    public isCurrencyAddressLoading = true
    public visible = false
    public wallet: WalletType

    constructor(public name: string) {
    }
  }

  export class CurrencyAddressCreate {
    public isCurrencyAddressCreate = true
    public visible = false
    public hidden = true
    public parent: WalletEntry
    public flatten: () => void

    constructor(public name: string, public wallet: WalletType) {
    }

    private getCurrencies(account: string) {
      let currencies = getStore().get(account)
      return currencies || []
    }

    private distinctValues = (value, index, self) => {
      return self.indexOf(value) === index
    }

    private addCurrency(account: string, currency: string) {
      let currencies = this.getCurrencies(account)
      currencies.push(currency)
      getStore().put(account, currencies.filter(this.distinctValues))
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

    createAddressByName(component: WalletComponentAbstract, name: string) {
      if (name == "Bitcoin") {
        this.createBtcAddress(component)
      } else if (name == "Ethereum") {
        this.createAddress(component)
      } else if (name == "FIMK") {
        this.createFIMKAddress(component)
      } else if (name == "NXT") {
        this.createNXTAddress(component)
      } else if (name == "ARDOR") {
        this.createARDRAddress(component)
      } else if (name == "Litecoin") {
        this.createLtcAddress(component)
      } else if (name == "BitcoinCash") {
        this.createBchAddress(component)
      }
    }

    /* Handler for creating a new address, this method is declared here (on the node so to say)
      still after an architectural change where we dont display the CREATE node anymore.
      We'll be leaving it in place where all you need to do is set this.hidden=false to
      have it displayed again. */
    createAddress(component: WalletComponentAbstract) {

      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('Ethereum', 'ETH', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        this.flatten()
        this.addCurrency(this.parent.account, 'ETH')
        return true
      }

      // determine the first 'nxt' address based of the last currencyBalance displayed
      let lastAddress = currencyBalances[currencyBalances.length - 1]['address']

      // look up the following address
      for (let i = 0; i < this.wallet.addresses.length; i++) {

        // we've found the address
        if (this.wallet.addresses[i].address == lastAddress) {

          // next address is the one - but if no more addresses we exit since not possible
          if (i == this.wallet.addresses.length - 1)
            return

          let nextAddress = this.wallet.addresses[i + 1]
          let newCurrencyBalance = new CurrencyBalance('Ethereum', 'ETH', nextAddress.address, nextAddress.privateKey)
          newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
          component.rememberAdressCreated(this.parent.account, nextAddress.address)
          newCurrencyBalance.visible = this.parent.expanded
          let index = this.parent.currencies.indexOf(currencyBalances[currencyBalances.length - 1]) + 1
          this.parent.currencies.splice(index, 0, newCurrencyBalance)
          this.flatten()
          this.addCurrency(this.parent.account, 'ETH')
          return true
        }
      }

      return false
    }

    createBtcAddress(component: WalletComponentAbstract) {

      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('Bitcoin', 'BTC', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        this.flatten()
        this.addCurrency(this.parent.account, 'BTC')
        return true
      }

      // determine the first 'nxt' address based of the last currencyBalance displayed
      let lastAddress = currencyBalances[currencyBalances.length - 1]['address']

      // when the last address is not yet used it should be used FIRST before we allow the creation of a new address
      if (!currencyBalances[currencyBalances.length - 1]['inUse']) {
        return false
      }

      // look up the following address
      for (let i = 0; i < this.wallet.addresses.length; i++) {

        // we've found the address
        if (this.wallet.addresses[i].address == lastAddress) {

          // next address is the one - but if no more addresses we exit since not possible
          if (i == this.wallet.addresses.length - 1)
            return

          let nextAddress = this.wallet.addresses[i + 1]
          let newCurrencyBalance = new CurrencyBalance('Bitcoin', 'BTC', nextAddress.address, nextAddress.privateKey)
          newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
          component.rememberAdressCreated(this.parent.account, nextAddress.address)
          newCurrencyBalance.visible = this.parent.expanded
          let index = this.parent.currencies.indexOf(currencyBalances[currencyBalances.length - 1]) + 1
          this.parent.currencies.splice(index, 0, newCurrencyBalance)
          this.flatten()
          this.addCurrency(this.parent.account, 'BTC')
          return true
        }
      }

      return false
    }

    createFIMKAddress(component: WalletComponentAbstract) {

      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('FIMK', 'FIM', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.addCurrency(this.parent.account, 'FIM')
        return true
      }

      return false
    }

    createNXTAddress(component: WalletComponentAbstract) {
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('NXT', 'NXT', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.addCurrency(this.parent.account, 'NXT')
        return true
      }
      return false
    }

    createARDRAddress(component: WalletComponentAbstract) {
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('ARDOR', 'ARDR', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        if (nextAddress.isDeleted === true) nextAddress.isDeleted = false
        this.removeIsDeleted(newCurrencyBalance)
        this.flatten()
        this.addCurrency(this.parent.account, 'ARDR')
        return true
      }
      return false
    }

    createLtcAddress(component: WalletComponentAbstract) {
      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('Litecoin', 'LTC', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address)
        newCurrencyBalance.visible = this.parent.expanded
        this.flatten()
        this.addCurrency(this.parent.account, 'LTC')
        return true
      }

      // determine the first 'nxt' address based of the last currencyBalance displayed
      let lastAddress = currencyBalances[currencyBalances.length - 1]['address']

      // when the last address is not yet used it should be used FIRST before we allow the creation of a new address
      if (!currencyBalances[currencyBalances.length - 1]['inUse']) {
        return false
      }

      // look up the following address
      for (let i = 0; i < this.wallet.addresses.length; i++) {

        // we've found the address
        if (this.wallet.addresses[i].address == lastAddress) {

          // next address is the one - but if no more addresses we exit since not possible
          if (i == this.wallet.addresses.length - 1)
            return

          let nextAddress = this.wallet.addresses[i + 1]
          let newCurrencyBalance = new CurrencyBalance('Litecoin', 'LTC', nextAddress.address, nextAddress.privateKey)
          newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
          component.rememberAdressCreated(this.parent.account, nextAddress.address)
          newCurrencyBalance.visible = this.parent.expanded
          let index = this.parent.currencies.indexOf(currencyBalances[currencyBalances.length - 1]) + 1
          this.parent.currencies.splice(index, 0, newCurrencyBalance)
          this.flatten()
          this.addCurrency(this.parent.account, 'LTC')
          return true
        }
      }

      return false
    }

    createBchAddress(component: WalletComponentAbstract) {

      // collect all CurrencyBalance of 'our' same currency type
      let currencyBalances = this.parent.currencies.filter(c => c['isCurrencyBalance'] && c.name == this.name)

      // if there is no address in use yet we use the first one
      if (currencyBalances.length == 0) {
        let nextAddress = this.wallet.addresses[0]
        let newCurrencyBalance = new CurrencyBalance('BitcoinCash', 'BCH', nextAddress.address, nextAddress.privateKey)
        newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
        component.rememberAdressCreated(this.parent.account, nextAddress.address.split(":")[1])
        newCurrencyBalance.visible = this.parent.expanded
        this.parent.currencies.push(newCurrencyBalance)
        this.flatten()
        return true
      }

      // determine the first 'nxt' address based of the last currencyBalance displayed
      let lastAddress = currencyBalances[currencyBalances.length - 1]['address']

      // when the last address is not yet used it should be used FIRST before we allow the creation of a new address
      if (!currencyBalances[currencyBalances.length - 1]['inUse']) {
        return false
      }

      // look up the following address
      for (let i = 0; i < this.wallet.addresses.length; i++) {

        // we've found the address
        if (this.wallet.addresses[i].address == lastAddress) {

          // next address is the one - but if no more addresses we exit since not possible
          if (i == this.wallet.addresses.length - 1)
            return

          let nextAddress = this.wallet.addresses[i + 1]
          let newCurrencyBalance = new CurrencyBalance('BitcoinCash', 'BCH', nextAddress.address, nextAddress.privateKey)
          newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.parent.account)
          component.rememberAdressCreated(this.parent.account, nextAddress.address.split(":")[1])
          newCurrencyBalance.visible = this.parent.expanded
          let index = this.parent.currencies.indexOf(currencyBalances[currencyBalances.length - 1]) + 1
          this.parent.currencies.splice(index, 0, newCurrencyBalance)
          this.flatten()
          return true
        }
      }

      return false
    }
  }

}
