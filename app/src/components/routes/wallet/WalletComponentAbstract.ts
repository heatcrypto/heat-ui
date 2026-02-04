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

  export let walletEntriesCache: Map<string, WalletEntry> = new Map<string, wlt.WalletEntry>()

  export abstract class WalletComponentAbstract {

    public lightwalletService: LightwalletService;
    public localKeyStore: LocalKeyStoreService;
    allLocked = true
    bitcoreService: BitcoreService;
    nxtCryptoService: NXTCryptoService;
    ardorCryptoService: ARDORCryptoService;
    ltcCryptoService: LTCCryptoService;
    fimkCryptoService: FIMKCryptoService;
    iotaCoreService: IotaCoreService;
    bchCryptoService: BCHCryptoService;

    entries: Array<wlt.WalletEntry | wlt.CurrencyBalance | wlt.TokenBalance> = []
    walletEntries: Array<wlt.WalletEntry> = []

    abstract flatten()

    // abstract handleFailedCryptoRequests(walletEntry, currencyAddressLoading, currencyName, currencySymbol)

    abstract shareCurrencyAddressesWithP2pContacts(currency: string, address: string)

    abstract initWalletEntry(walletEntry: wlt.WalletEntry)

    abstract showMessage(message: string)

    abstract exportWallet(onlyData?: boolean)

    initLocalKeyStore() {
      this.entries = []
      this.walletEntries = []
      this.localKeyStore.list().then(walletEntries => {
        walletEntries.map(entry => {
          let walletEntry = walletEntriesCache.get(entry.account)
          if (walletEntry) {
            walletEntry.setWalletComponent(this)
            walletEntry["cached"] = true
          } else {
            walletEntry = new wlt.WalletEntry(this, entry.account, entry.name, entry.selectedCurrencies)
          }
          this.walletEntries.push(walletEntry)
        });
        this.walletEntries.sort((a, b) => {
          return a.account.localeCompare(b.account)
        })
        this.walletEntries.forEach(walletEntry => {
          let password = this.localKeyStore.getPasswordForAccount(walletEntry.account)
          if (password) {
            this.allLocked = false
            this.localKeyStore.load(walletEntry.account, password).then(key => {
              if (key && !walletEntry["cached"]) {
                walletEntry.secretPhrase = key.secretPhrase
                walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
                walletEntry.unlocked = true
                walletEntry.pin = password
                walletEntry.label = key.label
                this.initWalletEntry(walletEntry)
              }
            }).catch((e) => console.error(e))
          }
        })
        this.flatten()
      })
    }

    updateWalletEntryOnPasswordChanged(account, password) {
      let walletEntry = this.walletEntries.find(w => w.account == account)
      this.localKeyStore.load(account, password).then(key => {
        if (key) {
          this.localKeyStore.rememberPassword(walletEntry.account, password)
          walletEntry.pin = password
          walletEntry.secretPhrase = key.secretPhrase
          walletEntry.bip44Compatible = this.lightwalletService.validSeed(key.secretPhrase)
          walletEntry.unlocked = true
          this.initWalletEntry(walletEntry)
          walletEntry.toggle(true)
        }
      }).catch(reason => console.warn(reason))
    }

    checkCreatedAddress(address: string, walletEntry: WalletEntry, currencySymbol: string, addresses: WalletAddress[]): {wasCreated: boolean, cachedBalance?: string} {
      let result = {wasCreated: false, cachedBalance: undefined}
      if (!addresses) return result
      let foundAddress: WalletAddress
      foundAddress = addresses.find(v => v.address == address)
      if (foundAddress) {
        if (!foundAddress.hasOwnProperty("created")) {
          let compatibleToPre = this.obsoleteCheckCreatedAddress(address, walletEntry.account, currencySymbol)
          if (compatibleToPre) {
            foundAddress.created = compatibleToPre.wasCreated
          }
        }
        result.wasCreated = foundAddress.created
      }
      return result
    }

    obsoleteCheckCreatedAddress(address: string, account: string, currencySymbol: string): {wasCreated: boolean, cachedBalance?: string} {
      let a = wlt.createdAddresses[account]

      if (!a) return {wasCreated: false}

      let result = {wasCreated: a.has(address), cachedBalance: null}

      // backward compatibility when these items were registered without prefix "bitcoincash:"
      if (address.startsWith("bitcoincash:")) {
        result.cachedBalance = a.get(address) || a.get(address.split(":")[1])
      } else {
        result.cachedBalance = a.get(address)
      }

      return result
    }

    public loadNXTAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let nxtCurrencyBalance = new wlt.CurrencyBalance(walletEntry, 'NXT', 'NXT', address.address, address.privateKey)
        nxtCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(walletEntry, balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = nxtCurrencyBalance.expanded
            nxtCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return nxtCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.NXT, this.nxtCryptoService.refreshBalances, createBalance
      )

    }

    public loadARDORAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let ardrCurrencyBalance = new wlt.CurrencyBalance(walletEntry, 'ARDOR', 'ARDR', address.address, address.privateKey)
        ardrCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(walletEntry, balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = ardrCurrencyBalance.expanded
            ardrCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return ardrCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.ARDOR, this.ardorCryptoService.refreshBalances, createBalance
      )
    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadFIMKAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let fimkCurrencyBalance = new wlt.CurrencyBalance(walletEntry, 'FIMK', 'FIM', address.address, address.privateKey)
        fimkCurrencyBalance.balance = address.balance ? address.balance + "" : "0"
        if (address.tokensBalances) {
          address.tokensBalances.forEach(balance => {
            let tokenBalance = new wlt.TokenBalance(walletEntry, balance.name, balance.symbol, balance.address)
            tokenBalance.balance = utils.commaFormat(balance.balance)
            tokenBalance.visible = fimkCurrencyBalance.expanded
            fimkCurrencyBalance.tokens.push(tokenBalance)
          })
        }
        return fimkCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.FIMK, this.fimkCryptoService.refreshBalances, createBalance
      )

    }

    /* Only when we expand a wallet entry do we lookup its balances */
    public loadEthereumAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (walletAddress: WalletAddress) => {
        let fillBalances = (currencyBalance: wlt.CurrencyBalance, wa: WalletAddress) => {
          if (wa.balance) currencyBalance.balance = Big(wa.balance).toFixed()
          if (!(wa.tokensBalances?.length > 0)) return
          //do not recreate new token objects but update existed because of usage tokens in the wallet entry list that exposed in the UI
          let i = 0
          for (const balance of wa.tokensBalances || []) {
            let tokenBalance = currencyBalance.tokens[i] || new wlt.TokenBalance(walletEntry, balance.name, balance.symbol, balance.address)
            tokenBalance.balance = balance.balance
            tokenBalance.visible = currencyBalance.expanded
            if (!currencyBalance.tokens[i]) currencyBalance.tokens.push(tokenBalance)
            i++
          }
        }

        let cb = new wlt.CurrencyBalance(walletEntry, 'Ethereum', 'ETH', walletAddress.address, walletAddress.privateKey, walletAddress.index)
        fillBalances(cb, walletAddress)

        cb.refresh = () => {
          return this.lightwalletService.loadAddressInfo(walletAddress).then(walletAddress => {
            if (!walletAddress) return
            fillBalances(cb, walletAddress)
          })
        }

        return cb
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.Ethereum, this.lightwalletService.refreshBalances.bind(this.lightwalletService), createBalance
      )

    }

    public loadBitcoinAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (walletAddress: WalletAddress) => {
        let cb = new wlt.CurrencyBalance(walletEntry, 'Bitcoin', 'BTC', walletAddress.address, walletAddress.privateKey, walletAddress.index)
        cb.balance = walletAddress.balance ? new Big(walletAddress.balance).times(new Big(100000000)).toString() : ""
        let btcBlockExplorerService: BtcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')

        cb.refresh = () => {
          return btcBlockExplorerService.getBalance(walletAddress.address).then(balance => {
                cb.balance = String(balance)
              },
              reason => console.error(reason)
          )
        }

        return cb
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.Bitcoin, this.bitcoreService.refreshBalances, createBalance
      )

    }

    public loadBitcoinCashAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (walletAddress: WalletAddress) => {
        let cb = new wlt.CurrencyBalance(walletEntry, 'BitcoinCash', 'BCH', walletAddress.address, walletAddress.privateKey, walletAddress.index)
        cb.balance = walletAddress.balance ? new Big(walletAddress.balance).times(new Big(100000000)).toString() : ""
        let bchBlockExplorerService: BchBlockExplorerService = heat.$inject.get('bchBlockExplorerService')

        cb.refresh = () => {
          return bchBlockExplorerService.getBalance(walletAddress.address).then(balance =>
                  cb.balance = String(balance),
                  reason => console.error(reason)
          )
        }

        return cb
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.BitcoinCash, this.bchCryptoService.refreshBalances, createBalance
      )

    }

    public loadLtcAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (walletAddress: WalletAddress) => {
        let cb = new wlt.CurrencyBalance(walletEntry, 'Litecoin', 'LTC', walletAddress.address, walletAddress.privateKey, walletAddress.index)
        cb.balance = walletAddress.balance ? new Big(walletAddress.balance).times(new Big(100000000)).toString() : ""
        let ltcBlockExplorerService: LtcBlockExplorerService = heat.$inject.get('ltcBlockExplorerService')

        cb.refresh = () => {
          return ltcBlockExplorerService.getBalance(walletAddress.address).then(balance => {
                cb.balance = String(balance)
              },
              reason => console.error(reason)
          )
        }

        return cb
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.Litecoin, this.ltcCryptoService.refreshBalances, createBalance
      )

    }

    public loadIotaAddresses(walletEntry: wlt.WalletEntry) {

      let createBalance = (address: WalletAddress) => {
        let iotaCurrencyBalance = new wlt.CurrencyBalance(walletEntry, 'Iota', 'i', address.address, address.privateKey)
        iotaCurrencyBalance.balance = Number(address.balance + "").toFixed(0)
        return iotaCurrencyBalance
      }

      this.loadAddresses(
          walletEntry, wlt.CURRENCIES.IOTA, this.iotaCoreService.refreshBalances, createBalance
      )

    }

    private loadAddresses(walletEntry: wlt.WalletEntry,
                          currencyDescriptor: {name: string, symbol: string, multiAddress: boolean},
                          requestAddresses: Function, createBalance: Function) {

      let addressLoading = walletEntry.findAddressLoading(currencyDescriptor.symbol)
      if (!addressLoading) return

      // migrate crypto addresses from obsolete store to actual store
      let cryptoAddresses = walletEntry.getCryptoAddresses(currencyDescriptor.symbol)?.addresses
      if (!cryptoAddresses || cryptoAddresses.length == 0) return
      let ca = wlt.createdAddresses[walletEntry.account]
      let upgraded = false
      if (ca?.size > 0) {
        cryptoAddresses.forEach(a => {
          let hashedAddr = wlt.HASH_PREFIX + heat.crypto.hash(a.address)
          if (ca.has(hashedAddr)) {
            a.created = true
            upgraded = true
            ca.delete(hashedAddr)
            window.localStorage.removeItem(`addresscreated-${walletEntry.account}-${hashedAddr}`)
          }
        })
      }
      // should be was created at least first address (probably due the bug  it was not created)
      // so force mark created first addresses
      /*if (!cryptoAddresses[0].created) {
        let i = 0
        while (i < 3 && i < cryptoAddresses.length) {
          cryptoAddresses[i].created = true
          i++
        }
      }*/
      let f = () => wlt.getCryptoAddresses(walletEntry, currencyDescriptor.symbol).then(addresses => {
        let actualWalletAddresses: WalletAddresses = {
          addresses: cryptoAddresses.filter(a => {
            if (a.isDeleted) return false
            let info = this.checkCreatedAddress(a.address, walletEntry, currencyDescriptor.symbol, addresses.addresses)
            return a.inUse || info.wasCreated || !currencyDescriptor.multiAddress
          })
        }

        if (actualWalletAddresses.addresses.length == 0) {
          addressLoading.visible = false
          return
        }

        return utils.timeoutPromise(requestAddresses(actualWalletAddresses, addressLoading), 8000).then((success) => {
          this.createBalanceEntries(walletEntry, addressLoading, actualWalletAddresses, createBalance, success || success == null)
        }).catch((reason) => {
          this.createBalanceEntries(walletEntry, addressLoading, actualWalletAddresses, createBalance, false)
          this.showMessage(`Error. Cannot connect to ${currencyDescriptor.symbol} server.`)
          //this.handleFailedCryptoRequests(walletEntry, addressLoading, currencyName, currencySymbol)
        })
      })

      let p = upgraded
          ? wlt.saveCryptoAddresses(
              walletEntry, currencyDescriptor.symbol, walletEntry.getCryptoAddresses(currencyDescriptor.symbol)).then(() => f()
          )
          : Promise.resolve()
      p.then(() => f())
          .finally(() => addressLoading.visible = false)
    }

    private createBalanceEntries(walletEntry: wlt.WalletEntry,
                                 addressLoading: wlt.CurrencyAddressLoading,
                                 actualWalletAddresses: WalletAddresses,
                                 createBalance: Function,
                                 successLoaded: boolean) {
      /* Make sure we exit if no loading node exists */
      if (!walletEntry.currencies.find(c => c['isCurrencyAddressLoading'])) return

      let index = walletEntry.currencies.indexOf(addressLoading)
      let counter = 0
      let addresses = actualWalletAddresses.addresses
      addresses.forEach(address => {
        let createdAddress = this.checkCreatedAddress(address.address, walletEntry, addressLoading.currencySymbol, addresses)
        if (counter >= wlt.DISPLAYED_MAX_EMPTY_ADDRESSES && !address.inUse) return
        let currencyBalance: wlt.CurrencyBalance = createBalance(address)
        currencyBalance.visible = walletEntry.expanded
        currencyBalance.inUse = !createdAddress.wasCreated
        //currencyBalance.balance = currencyBalance.balance || addressBalance || ""
        if (successLoaded) {
          if (createdAddress.wasCreated && currencyBalance.balance && /[0-9]/.test(currencyBalance.balance)) {
            //remember balance to display it when "no connection"
            //todo another way saving balance
            // wlt.rememberAddressCreated(walletEntry.account, address.address, currencyBalance.balance);
          }
        } else {
          //currencyBalance.balance = /[0-9]/.test(createdAddress?.cachedBalance) ? createdAddress.cachedBalance : ""
          currencyBalance.stateMessage = "No Connection" + (currencyBalance.balance ? ". Cached value" : "")
        }
        walletEntry.currencies.splice(index, 0, currencyBalance)
        index++
        if (!currencyBalance.balance) counter++
      })
      // we can remove the loading entry
      walletEntry.currencies = walletEntry.currencies.filter(c => c != addressLoading)
      this.flatten()
    }

    walletFilter: wlt.WalletFilter

    applyFilter(query: string, logicalOperator: 'and' | 'or'): Promise<wlt.SearchResultExplainedType> {
      let promises: Promise<any>[] = []
      let cleanedQuery = query.trim()
      if (cleanedQuery) {
        this.walletFilter = new wlt.WalletFilter(cleanedQuery)
        let searchResultExplained = []
        this.entries.forEach(entry => {
          if (entry instanceof wlt.WalletEntry) {
            promises.push((<wlt.WalletEntry>entry).applyFilter(this.walletFilter, logicalOperator).then(finds => {
              if (finds && entry.filtered) searchResultExplained.push({account: entry.account, finds: finds})
            }))
          }
        })
        return Promise.all(promises).then(() => {
          return {
            searchResultExplained: searchResultExplained,
            queryTokens: this.walletFilter.queryTokens,
            filteredCount: [searchResultExplained.length, this.entries.length]
          }
        })
      } else {
        this.walletFilter = null
        this.entries.forEach(entry => {
          entry.filtered = null
        })
        return Promise.resolve(null)
      }
    }
  }

}
