module wlt {

  export interface IWalletComponent {

    walletEntries: any

    flatten()

    rememberAdressCreated(account: string, address: string): void

    loadEthereumAddresses(entry: WalletEntry): void

    loadBitcoinAddresses(entry: WalletEntry): void

    loadFIMKAddresses(entry: WalletEntry): void

    loadNXTAddresses(entry: WalletEntry): void

    loadARDORAddresses(entry: WalletEntry): void

    loadIotaAddresses(entry: WalletEntry): void

    loadLtcAddresses(entry: WalletEntry): void

    loadBitcoinCashAddresses(entry: WalletEntry): void

    shareCurrencyAddressesWithP2pContacts(currency: string, address: string)

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

    private getStore() {
      let storage = <StorageService>heat.$inject.get('storage')
      let $rootScope = heat.$inject.get('$rootScope')
      return storage.namespace('wallet', $rootScope, true)
    }

    private getCurrencies(account: string) {
      let currencies = this.getStore().get(account)
      if (!currencies)
        currencies = []
      return currencies
    }

    private distinctValues = (value, index, self) => {
      return self.indexOf(value) === index
    }

    private addCurrency(account: string, currency: string) {
      let store = this.getStore()
      let currencies = this.getCurrencies(account)
      currencies.push(currency)
      store.put(account, currencies.filter(this.distinctValues))
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

    createAddressByName(component: IWalletComponent, name: string) {
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
    createAddress(component: IWalletComponent) {

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

    createBtcAddress(component: IWalletComponent) {

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

    createFIMKAddress(component: IWalletComponent) {

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

    createNXTAddress(component: IWalletComponent) {
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

    createARDRAddress(component: IWalletComponent) {
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

    createLtcAddress(component: IWalletComponent) {
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

    createBchAddress(component: IWalletComponent) {

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

  export class WalletEntry {
    public isWalletEntry = true
    public selected = true
    public identifier: string
    public label: string
    public secretPhrase: string
    public bip44Compatible: boolean
    public currencies: Array<CurrencyBalance | CurrencyAddressCreate | CurrencyAddressLoading> = []
    public pin: string
    public unlocked = false
    public visible = true
    public expanded = false
    public btcWalletAddressIndex = 0

    constructor(public account: string,
                public name: string,
                public component: IWalletComponent //user may assign any text for wallet account
    ) {
      this.identifier = name ? `${account} | ${name}` : account
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

    initBTC(walletComponent: IWalletComponent, wallet: WalletType, user: UserService) {
      let btcCurrencyAddressLoading = new CurrencyAddressLoading('Bitcoin')
      btcCurrencyAddressLoading.visible = this.expanded;
      btcCurrencyAddressLoading.wallet = wallet;
      this.currencies.push(btcCurrencyAddressLoading);

      let btcCurrencyAddressCreate = new wlt.CurrencyAddressCreate('Bitcoin', wallet)
      btcCurrencyAddressCreate.visible = this.expanded
      btcCurrencyAddressCreate.parent = this
      btcCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(btcCurrencyAddressCreate)

      walletComponent.flatten()
      if (user.account === this.account)
        walletComponent.shareCurrencyAddressesWithP2pContacts('BTC', wallet.addresses[0].address)

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadBitcoinAddresses(this)
      }
    }

    initEth(walletComponent: IWalletComponent, wallet: WalletType) {
      let ethCurrencyAddressLoading = new CurrencyAddressLoading('Ethereum')
      ethCurrencyAddressLoading.visible = this.expanded
      ethCurrencyAddressLoading.wallet = wallet
      this.currencies.push(ethCurrencyAddressLoading)

      let ethCurrencyAddressCreate = new wlt.CurrencyAddressCreate('Ethereum', wallet)
      ethCurrencyAddressCreate.visible = this.expanded
      ethCurrencyAddressCreate.parent = this
      ethCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)

      this.currencies.push(ethCurrencyAddressCreate)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadEthereumAddresses(this)
      }
    }

    initIota(walletComponent: IWalletComponent, wallet: WalletType) {
      let iotaCurrencyAddressLoading = new CurrencyAddressLoading('Iota')
      iotaCurrencyAddressLoading.visible = this.expanded
      iotaCurrencyAddressLoading.wallet = wallet
      this.currencies.push(iotaCurrencyAddressLoading)

      let iotaCurrencyAddressCreate = new wlt.CurrencyAddressCreate('Iota', wallet)
      iotaCurrencyAddressCreate.visible = this.expanded
      iotaCurrencyAddressCreate.parent = this
      iotaCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)

      this.currencies.push(iotaCurrencyAddressCreate)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadIotaAddresses(this)
      }
    }

    initFIMK(walletComponent: IWalletComponent, wallet: WalletType) {
      let fimkCurrencyAddressLoading = new CurrencyAddressLoading('FIMK')
      fimkCurrencyAddressLoading.visible = this.expanded
      fimkCurrencyAddressLoading.wallet = wallet
      this.currencies.push(fimkCurrencyAddressLoading)

      let fimkCurrencyAddressCreate = new wlt.CurrencyAddressCreate('FIMK', wallet)
      fimkCurrencyAddressCreate.visible = this.expanded
      fimkCurrencyAddressCreate.parent = this
      fimkCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(fimkCurrencyAddressCreate)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadFIMKAddresses(this)
      }
    }

    initNXT(walletComponent: IWalletComponent, wallet: WalletType) {
      let nxtCurrencyAddressLoading = new CurrencyAddressLoading('NXT')
      nxtCurrencyAddressLoading.visible = this.expanded
      nxtCurrencyAddressLoading.wallet = wallet
      this.currencies.push(nxtCurrencyAddressLoading)

      let nxtCurrencyAddressCreate = new wlt.CurrencyAddressCreate('NXT', wallet)
      nxtCurrencyAddressCreate.visible = this.expanded
      nxtCurrencyAddressCreate.parent = this
      nxtCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(nxtCurrencyAddressCreate)

      if (this.expanded) {
        walletComponent.loadNXTAddresses(this)
      }
    }

    initARDOR(walletComponent: IWalletComponent, wallet: WalletType) {
      let ardorCurrencyAddressLoading = new CurrencyAddressLoading('ARDOR')
      ardorCurrencyAddressLoading.visible = this.expanded
      ardorCurrencyAddressLoading.wallet = wallet
      this.currencies.push(ardorCurrencyAddressLoading)

      let ardorCurrencyAddressCreate = new wlt.CurrencyAddressCreate('ARDOR', wallet)
      ardorCurrencyAddressCreate.visible = this.expanded
      ardorCurrencyAddressCreate.parent = this
      ardorCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(ardorCurrencyAddressCreate)

      if (this.expanded) {
        walletComponent.loadARDORAddresses(this)
      }
    }

    initLTC(walletComponent: IWalletComponent, wallet: WalletType) {
      let ltcCurrencyAddressLoading = new wlt.CurrencyAddressLoading('Litecoin')
      ltcCurrencyAddressLoading.visible = this.expanded;
      ltcCurrencyAddressLoading.wallet = wallet;
      this.currencies.push(ltcCurrencyAddressLoading);

      let ltcCurrencyAddressCreate = new wlt.CurrencyAddressCreate('Litecoin', wallet)
      ltcCurrencyAddressCreate.visible = this.expanded
      ltcCurrencyAddressCreate.parent = this
      ltcCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(ltcCurrencyAddressCreate)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadLtcAddresses(this)
      }
    }

    initBCH(walletComponent: IWalletComponent, wallet: WalletType) {
      let bchCurrencyAddressLoading = new wlt.CurrencyAddressLoading('BitcoinCash')
      bchCurrencyAddressLoading.visible = this.expanded;
      bchCurrencyAddressLoading.wallet = wallet;
      this.currencies.push(bchCurrencyAddressLoading);

      let bchCurrencyAddressCreate = new wlt.CurrencyAddressCreate('BitcoinCash', wallet)
      bchCurrencyAddressCreate.visible = this.expanded
      bchCurrencyAddressCreate.parent = this
      bchCurrencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
      this.currencies.push(bchCurrencyAddressCreate)

      walletComponent.flatten()

      /* Only if this node is expanded will we load the addresses */
      if (this.expanded) {
        walletComponent.loadBitcoinCashAddresses(this)
      }
    }

  }

}
