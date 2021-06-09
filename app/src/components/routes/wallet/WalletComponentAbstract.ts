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

  export abstract class WalletComponentAbstract {

    public lightwalletService: LightwalletService;
    public localKeyStore: LocalKeyStoreService;
    entries: Array<wlt.WalletEntry | wlt.CurrencyBalance | wlt.TokenBalance> = []
    bitcoreService: BitcoreService;
    nxtCryptoService: NXTCryptoService;
    ardorCryptoService: ARDORCryptoService;
    ltcCryptoService: LTCCryptoService;
    fimkCryptoService: FIMKCryptoService;
    iotaCoreService: IotaCoreService;
    bchCryptoService: BCHCryptoService;

    walletEntries: Array<wlt.WalletEntry> = []
    createdAddresses: { [key: string]: Array<string> } = {}

    abstract flatten()

    abstract handleFailedCryptoRequests(walletEntry, currencyAddressLoading, currencyName, currencySymbol)

    abstract shareCurrencyAddressesWithP2pContacts(currency: string, address: string)

    abstract initWalletEntry(walletEntry: wlt.WalletEntry)

    initLocalKeyStore() {
      this.entries = []
      this.walletEntries = []
      this.localKeyStore.list().map((account: string) => {
        let name = this.localKeyStore.keyName(account)
        let walletEntry = new wlt.WalletEntry(account, name, this)
        this.walletEntries.push(walletEntry)
      });
      this.walletEntries.sort((a, b) => {
        return a.account.localeCompare(b.account)
      })
      this.walletEntries.forEach(walletEntry => {
        let password = this.localKeyStore.getPasswordForAccount(walletEntry.account)
        if (password) {
          try {
            var key = this.localKeyStore.load(walletEntry.account, password);
            if (key) {
              walletEntry.secretPhrase = key.secretPhrase
              walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
              walletEntry.unlocked = true
              walletEntry.pin = password
              walletEntry.label = key.label
              this.initWalletEntry(walletEntry)
            }
          } catch (e) { console.log(e) }
        }
      })
      this.flatten()
      this.fetchCryptoAddresses('BTC')
    }

    fetchCryptoAddresses(currency: string) {
      let p2pContactsUtils = <ContactService>heat.$inject.get('contactService')
      let p2pMessaging = <P2PMessaging>heat.$inject.get('P2PMessaging')
      p2pMessaging.p2pContactStore.forEach((key, contact) => {
        console.log(`fetching ${currency} of p2p contact: ${contact.account}`)
        p2pContactsUtils.fetchCryptoAddress(contact, currency)
      })
    }

    initCreatedAddresses() {
      for (let i = 0; i < window.localStorage.length; i++) {
        let key = window.localStorage.key(i)
        let data = key.match(/eth-address-created:(.+):(.+)/)
        if (data) {
          let acc = data[1], addr = data[2]
          this.createdAddresses[acc] = this.createdAddresses[acc] || []
          this.createdAddresses[acc].push(addr)
        }
      }
    }

    rememberAdressCreated(account: string, ethAddress: string) {
      this.createdAddresses[account] = this.createdAddresses[account] || []
      this.createdAddresses[account].push(ethAddress)
      window.localStorage.setItem(`eth-address-created:${account}:${ethAddress}`, "1")
    }

    public loadNXTAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let nxtCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies.find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'NXT')
      if (!nxtCurrencyAddressLoading) return

      utils.timeoutPromise(this.nxtCryptoService.refreshAdressBalances(nxtCurrencyAddressLoading.wallet), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(nxtCurrencyAddressLoading)
        nxtCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let nxtCurrencyBalance = new wlt.CurrencyBalance('NXT', 'NXT', address.address, address.privateKey)
            nxtCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
            nxtCurrencyBalance.visible = walletEntry.expanded
            nxtCurrencyBalance.inUse = !wasCreated
            nxtCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, nxtCurrencyBalance)
            index++;

            if (address.tokensBalances) {
              address.tokensBalances.forEach(balance => {
                let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
                tokenBalance.balance = utils.commaFormat(balance.balance)
                tokenBalance.visible = walletEntry.expanded
                nxtCurrencyBalance.tokens.push(tokenBalance)
              })
            }
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != nxtCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("NXT refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, nxtCurrencyAddressLoading, 'NXT', 'NXT')
      })
    }

    public loadARDORAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let ardorCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'ARDOR')
      if (!ardorCurrencyAddressLoading) return

      utils.timeoutPromise(this.ardorCryptoService.refreshAdressBalances(ardorCurrencyAddressLoading.wallet), 9000).then(() => {
        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(ardorCurrencyAddressLoading)
        ardorCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let ardrCurrencyBalance = new wlt.CurrencyBalance('ARDOR', 'ARDR', address.address, address.privateKey)
            ardrCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
            ardrCurrencyBalance.visible = walletEntry.expanded
            ardrCurrencyBalance.inUse = !wasCreated
            ardrCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, ardrCurrencyBalance)
            index++;

            if (address.tokensBalances) {
              address.tokensBalances.forEach(balance => {
                let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
                tokenBalance.balance = utils.commaFormat(balance.balance)
                tokenBalance.visible = walletEntry.expanded
                ardrCurrencyBalance.tokens.push(tokenBalance)
              })
            }
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != ardorCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("ARDOR refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, ardorCurrencyAddressLoading, 'ARDOR', 'ARDR')
      })
    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadFIMKAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let fimkCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'FIMK')
      if (!fimkCurrencyAddressLoading) return

      utils.timeoutPromise(this.fimkCryptoService.refreshAdressBalances(fimkCurrencyAddressLoading.wallet), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(fimkCurrencyAddressLoading)
        fimkCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let fimkCurrencyBalance = new wlt.CurrencyBalance('FIMK', 'FIM', address.address, address.privateKey)
            fimkCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
            fimkCurrencyBalance.visible = walletEntry.expanded
            fimkCurrencyBalance.inUse = !wasCreated
            fimkCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, fimkCurrencyBalance)
            index++;

            if (address.tokensBalances) {
              address.tokensBalances.forEach(balance => {
                let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
                tokenBalance.balance = utils.commaFormat(balance.balance)
                tokenBalance.visible = walletEntry.expanded
                fimkCurrencyBalance.tokens.push(tokenBalance)
              })
            }
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != fimkCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("FIMK refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, fimkCurrencyAddressLoading, 'FIMK', 'FIM')
      })
    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadEthereumAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let ethCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Ethereum')
      if (!ethCurrencyAddressLoading) return

      utils.timeoutPromise(this.lightwalletService.refreshAdressBalances(ethCurrencyAddressLoading.wallet, ethCurrencyAddressLoading), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(ethCurrencyAddressLoading)
        ethCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let ethCurrencyBalance = new wlt.CurrencyBalance('Ethereum', 'ETH', address.address, address.privateKey)
            ethCurrencyBalance.balance = Big(address.balance).toFixed()
            ethCurrencyBalance.visible = walletEntry.expanded
            ethCurrencyBalance.inUse = !wasCreated
            ethCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, ethCurrencyBalance)
            index++;

            if (address.tokensBalances) {
              address.tokensBalances.forEach(balance => {
                let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
                tokenBalance.balance = balance.balance
                tokenBalance.visible = walletEntry.expanded
                ethCurrencyBalance.tokens.push(tokenBalance)
              })
            }
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != ethCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("ETH refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, ethCurrencyAddressLoading, 'Ethereum', 'ETH')
      })
    }

    public loadIotaAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let iotaCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Iota')
      if (!iotaCurrencyAddressLoading) return

      utils.timeoutPromise(this.iotaCoreService.refreshAdressBalances(iotaCurrencyAddressLoading.wallet), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(iotaCurrencyAddressLoading)
        iotaCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let iotaCurrencyBalance = new wlt.CurrencyBalance('Iota', 'i', address.address, address.privateKey)
            iotaCurrencyBalance.balance = Number(address.balance + "").toFixed(0)
            iotaCurrencyBalance.visible = walletEntry.expanded
            iotaCurrencyBalance.inUse = !wasCreated
            iotaCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, iotaCurrencyBalance)
            index++;
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != iotaCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("IOTA refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, iotaCurrencyAddressLoading, 'IOTA', 'IOTA')
      })
    }

    public loadBitcoinAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let btcCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Bitcoin')
      if (!btcCurrencyAddressLoading) return

      utils.timeoutPromise(this.bitcoreService.refreshBalances(btcCurrencyAddressLoading.wallet, btcCurrencyAddressLoading), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(btcCurrencyAddressLoading)
        btcCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let btcCurrencyBalance = new wlt.CurrencyBalance('Bitcoin', 'BTC', address.address, address.privateKey)
            btcCurrencyBalance.balance = (address.balance || "0") + ""
            btcCurrencyBalance.visible = walletEntry.expanded
            btcCurrencyBalance.inUse = !wasCreated
            btcCurrencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, btcCurrencyBalance)
            index++;
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != btcCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("BTC refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, btcCurrencyAddressLoading, 'Bitcoin', 'BTC')
      })
    }

    public loadBitcoinCashAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let bchCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'BitcoinCash')
      if (!bchCurrencyAddressLoading) return

      utils.timeoutPromise(this.bchCryptoService.refreshAdressBalances(bchCurrencyAddressLoading.wallet), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(bchCurrencyAddressLoading)
        bchCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address.split(":")[1]) != -1
          if (address.inUse || wasCreated) {
            let bchCurrencyBalance = new wlt.CurrencyBalance('BitcoinCash', 'BCH', address.address, address.privateKey)
            bchCurrencyBalance.balance = address.balance + ""
            bchCurrencyBalance.visible = walletEntry.expanded
            bchCurrencyBalance.inUse = !wasCreated
            bchCurrencyBalance.walletEntry = walletEntry

            walletEntry.currencies.splice(index, 0, bchCurrencyBalance)
            index++;
          }
        })

        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != bchCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("BCH refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, bchCurrencyAddressLoading, 'BitcoinCash', 'BCH')
      })
    }

    public loadLtcAddresses(walletEntry: wlt.WalletEntry) {

      /* Find the Loading node, if thats not available we can exit */
      let ltcCurrencyAddressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
        .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name == 'Litecoin')
      if (!ltcCurrencyAddressLoading) return

      utils.timeoutPromise(this.ltcCryptoService.refreshAdressBalances(ltcCurrencyAddressLoading.wallet, ltcCurrencyAddressLoading), 9000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(ltcCurrencyAddressLoading)
        ltcCurrencyAddressLoading.wallet.addresses.forEach(address => {
          let wasCreated = (this.createdAddresses[walletEntry.account] || []).indexOf(address.address) != -1
          if (address.inUse || wasCreated) {
            let ltcCurrencyBalance = new wlt.CurrencyBalance('Litecoin', 'LTC', address.address, address.privateKey)
            ltcCurrencyBalance.balance = address.balance + ""
            ltcCurrencyBalance.visible = walletEntry.expanded
            ltcCurrencyBalance.inUse = !wasCreated
            ltcCurrencyBalance.walletEntry = walletEntry

            walletEntry.currencies.splice(index, 0, ltcCurrencyBalance)
            index++;
          }
        })

        walletEntry.currencies = walletEntry.currencies.filter(c => c != ltcCurrencyAddressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error("LTC refreshing balances error", reason)
        this.handleFailedCryptoRequests(walletEntry, ltcCurrencyAddressLoading, 'Litecoin', 'LTC')
      })
    }

  }

}
