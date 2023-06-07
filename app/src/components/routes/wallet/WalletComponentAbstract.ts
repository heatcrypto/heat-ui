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

    wasCreated(address: string, account: string) {
      let a = wlt.createdAddresses[account]

      // backward compatibility when these items were registered without prefix "bitcoincash:"
      if (address.startsWith("bitcoincash:")) return a ? a.has(address) || a.has(address.split(":")[1]) : false

      return a ? a.has(address) : false
    }

    public loadNXTAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let nxtCurrencyBalance = new wlt.CurrencyBalance('NXT', 'NXT', address.address, address.privateKey)
        nxtCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = walletEntry.expanded
            nxtCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return nxtCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, 'NXT', 'NXT',
          this.nxtCryptoService.refreshBalances,
          createBalance
      )

    }

    public loadARDORAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let ardrCurrencyBalance = new wlt.CurrencyBalance('ARDOR', 'ARDR', address.address, address.privateKey)
        ardrCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = walletEntry.expanded
            ardrCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return ardrCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, 'ARDOR', 'ARDR',
          this.ardorCryptoService.refreshBalances,
          createBalance
      )
    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadFIMKAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let fimkCurrencyBalance = new wlt.CurrencyBalance('FIMK', 'FIM', address.address, address.privateKey)
        fimkCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = walletEntry.expanded
            fimkCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return fimkCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, 'FIMK', 'FIM',
          this.fimkCryptoService.refreshBalances,
          createBalance
      )

    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadEthereumAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let ethCurrencyBalance = new wlt.CurrencyBalance('Ethereum', 'ETH', address.address, address.privateKey, address.index)
        if (address.balance) {
          ethCurrencyBalance.balance = Big(address.balance).toFixed()
        }
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(balance.name, balance.symbol, balance.address)
            tokenBalance.balance = balance.balance
            tokenBalance.visible = walletEntry.expanded
            ethCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return ethCurrencyBalance
      }

      this.loadAddresses(
          walletEntry,
          'Ethereum',
          'ETH',
          this.lightwalletService.refreshBalances,
          createBalance
      )

    }

    public loadIotaAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let iotaCurrencyBalance = new wlt.CurrencyBalance('Iota', 'i', address.address, address.privateKey)
        iotaCurrencyBalance.balance = Number(address.balance + "").toFixed(0)
        return iotaCurrencyBalance
      }

      this.loadAddresses(
          walletEntry,
          'Iota',
          'i',
          this.iotaCoreService.refreshBalances,
          createBalance
      )

    }

    public loadBitcoinAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let btcCurrencyBalance = new wlt.CurrencyBalance('Bitcoin', 'BTC', address.address, address.privateKey, address.index)
        btcCurrencyBalance.balance = address.balance + ""
        return btcCurrencyBalance
      }

      this.loadAddresses(
          walletEntry,
          'Bitcoin',
          'BTC',
          this.bitcoreService.refreshBalances,
          createBalance
      )

    }

    public loadBitcoinCashAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let bchCurrencyBalance = new wlt.CurrencyBalance('BitcoinCash', 'BCH', address.address, address.privateKey, address.index)
        bchCurrencyBalance.balance = address.balance + ""
        return bchCurrencyBalance
      }

      this.loadAddresses(
          walletEntry,
          'BitcoinCash',
          'BCH',
          this.bchCryptoService.refreshBalances,
          createBalance
      )

    }

    public loadLtcAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let ltcCurrencyBalance = new wlt.CurrencyBalance('Litecoin', 'LTC', address.address, address.privateKey, address.index)
        ltcCurrencyBalance.balance = address.balance + ""
        return ltcCurrencyBalance
      }

      this.loadAddresses(
          walletEntry,
          'Litecoin',
          'LTC',
          this.ltcCryptoService.refreshBalances,
          createBalance
      )

    }

    private loadAddresses(walletEntry: wlt.WalletEntry, currencyName: string, currencySymbol: string,
                          requestAddresses: Function, createBalance: Function) {

      /* Find the Loading node, if thats not available we can exit */
      let addressLoading = <wlt.CurrencyAddressLoading>walletEntry.currencies
          .find(c => (<wlt.CurrencyAddressLoading>c).isCurrencyAddressLoading && c.name.toUpperCase() == currencyName.toUpperCase())
      if (!addressLoading) return

      utils.timeoutPromise(requestAddresses(addressLoading.wallet, addressLoading), 18000).then(() => {

        /* Make sure we exit if no loading node exists */
        if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

        let index = walletEntry.currencies.indexOf(addressLoading)
        addressLoading.wallet.addresses.forEach(address => {
          let wasCreated = this.wasCreated(address.address, walletEntry.account)
          if ((address.inUse || wasCreated) && !address.isDeleted) {
            let currencyBalance: wlt.CurrencyBalance = createBalance(address)
            currencyBalance.visible = walletEntry.expanded
            currencyBalance.inUse = !wasCreated
            currencyBalance.walletEntry = walletEntry
            walletEntry.currencies.splice(index, 0, currencyBalance)
            index++;
          }
        })
        // we can remove the loading entry
        walletEntry.currencies = walletEntry.currencies.filter(c => c != addressLoading)
        this.flatten()
      }).catch((reason) => {
        console.error(`${currencyName} refreshing balances error`, reason)
        this.handleFailedCryptoRequests(walletEntry, addressLoading, currencyName, currencySymbol)
      })
    }

  }

}
