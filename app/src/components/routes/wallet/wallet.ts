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
    Bitcoin: {name: 'Bitcoin', symbol: 'BTC', multiAddress: true, formatBalance: defaultFormatBalance, network: 'bitcoin'},
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

  export const SYM_CURRENCIES_MAP = new Map<string, any>(CURRENCIES_LIST.map(v => [v.symbol, v]))

  // @ts-ignore
  export const CURRENCY_SYMBOLS = wlt.SYM_CURRENCIES_MAP.keys().toArray()

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

  export function distinctValues(value, index, self) {
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

  export function getEntryVisibleLabelList(account): string[][] {
    const store = getStore()
    return store.keys().filter(v => v.indexOf(`label.${account}`) > -1).map(k => [k, store.get(k)])
  }

  export function updateEntryVisibleLabelList(account, list: string[][]) {
    const store = getStore()
    for (let ss of list) {
      store.put(ss[0], ss[1])
    }
  }

  export function getEntryVisibleLabel(account, address?: string) {
    if (address) {
      let subEntryKey = converters.byteArrayToHexString(heat.crypto.hexToHash8Bytes(address))
      return getStore().get(`label.${account}.${subEntryKey || ''}`)
    }
    return getStore().get(`label.${account}`)
  }

  export function updateEntryVisibleLabel(visibleLabel, account, address?: string) {
    const storeKey = address
        ? `label.${account}.${converters.byteArrayToHexString(heat.crypto.hexToHash8Bytes(address)) || ''}`
        : `label.${account}`
    if (visibleLabel) {
      getStore().put(storeKey, visibleLabel)
    } else {
      getStore().remove(storeKey)
    }
  }

  export function getEntryBip44Compatible(account) {
    return !!getStore().get("bip44." + account)
  }

  export function saveEntryBip44Compatible(account, bip44Compatible) {
    if (bip44Compatible && !getEntryBip44Compatible(account)) {
      getStore().put("bip44." + account, 1)
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
    let addresses = cryptoAddresses?.addresses
    if (!addresses) return null
    let foundAddress = addresses.find(a => a.address == createdAddress.address)
    if (!foundAddress && !walletEntry.bip44Compatible) {
      addresses.push(createdAddress)
      foundAddress = createdAddress
    }
    if (!foundAddress) return
    if (foundAddress.index != undefined && !walletEntry.bip44Compatible) delete foundAddress.index
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
