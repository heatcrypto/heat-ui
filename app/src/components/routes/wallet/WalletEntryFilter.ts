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

  type WalletSearchTracker = {
    /**
     * find items matching token
     */
    find: (name: string, item: string, exact?: boolean) => { token: string, item: string },
    /**
     * detailed info of finds (where it were found)
     */
    finds: Map<string, string[]>
  }

  function getSubEntryVisibleLabelList(account): Promise<string[]> {
    let parentHashed = db.compactHash(account + wlt.DB_VALUE_SALT)
    return db.listWalletItems(parentHashed).then((list: any[]) => list.map(v => v.label))
    /*
    const store = wlt.getStore()
    return store.keys().filter(v => v.indexOf(`label.${account}`) > -1).map(k => [k, store.get(k)])
     */
  }


  export class WalletEntryFilter {

    constructor(private we: wlt.WalletEntry) {
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

      //load each page sequentially until the empty page. Do not look behind 100th page
      let pages: any[] = []
      let num = 0
      let p = () => {
        return db.getValue(wlt.CACHE_KEY.addressInfo(currency.symbol, a.address) + '-' + num).then((page: any[]) => {
          if (page && num < 100) {
            pages.push(page)
            num++
            return p()
          }
        })
      }

      return p().then(() => {
        for (const page of pages) {
          for (const tx of page) {
            let txStr = `${currency.name} ${typeof a.index === "number" ? '#' + a.index : ''}`
            //find tx id
            let txId = tx.hash || tx.txid
            let detection = find(`${txStr} transaction id`, txId)
            if (detection) {
              isFind = true
              queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }
            //find tx from/to
            detection = find(`${txStr} transaction from/to`, `${tx.from} / ${tx.to}`)
            if (detection) {
              isFind = true
              queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }
            //find payment memo
            let localPaymentMessages: {method: number, text: string} = tx.message
            if (localPaymentMessages?.text) {
              detection = find(`${txStr} payment memo`, localPaymentMessages.text)
              if (detection) {
                isFind = true
                queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
              }
            }
          }
        }
        if (queryTokens == null) return isFind  //for applying OR operator
        return queryTokens  //for applying AND operator
      })
    }

    apply(walletFilter: WalletFilter, logicalOperator: 'and' | 'or') {
      let registry = this.trackFinds(walletFilter)
      this.we.filtered = false
      let p: Promise<any[]>
      if (logicalOperator == "or") p = this.applyOperatorOr(walletFilter, registry)
      if (logicalOperator == "and") p = this.applyOperatorAnd(walletFilter, registry)
      return p.then(value => {
        if (registry.finds.size > 0) {
          //console.log(this.walletEntry.account, this.walletEntry.filtered, registry.finds)
          return registry.finds
        }
      })
    }

    private applyOperatorOr(walletFilter: wlt.WalletFilter, registry: WalletSearchTracker) {
      let find = registry.find

      this.we.filtered = !!(find('account', this.we.account)
          || find('account name', this.we.name)
          || find('account label', this.we.visibleLabel)
          || find('account private label', this.we.label))

      let promises: Promise<any>[] = []

      // find currency addresses labels
      promises.push(getSubEntryVisibleLabelList(this.we.account).then(labels => {
        for (let label of labels) {
          if (find(`${this.we.account} address label`, label)) {
            this.we.filtered = true
          }
        }
      }))

      let entryCurrencySymbols = Array.from(this.we.selectedCurrencies)
      entryCurrencySymbols.push(wlt.CURRENCIES.HEAT.symbol)

      //this.walletEntry.selectedCurrencies = wlt.getStore().get(this.walletEntry.account) || []
      for (let currencySymbol of this.we.selectedCurrencies) {
        let c = wlt.SYM_CURRENCIES_MAP.get(currencySymbol)
        if (find('currency', currencySymbol, true) || find('currency', c.name)) {
          this.we.filtered = true
        }
        let addresses = this.we.getCryptoAddresses(currencySymbol)?.addresses
        if (addresses) {
          for (let a of addresses) {
            if (find(`${c.name} #${typeof a.index === "number" ? a.index : ''}`, a.address)) {
              this.we.filtered = true
            }
            // search in cached transactions
            promises.push(this.findInTransactions(find, null, c, a).then(v => {
              if (v) this.we.filtered = true
            }))
          }
        }
        let cb = this.we.findCurrencyBalance(currencySymbol)
        if (cb) {
          if (find(`${cb.name} balance`, cb.balance)) {
            this.we.filtered = true
          }
          for (let t of (cb.tokens || [])) {
            if (find(`${c.name} token '${t.symbol}'`, t.name)) {
              this.we.filtered = true
            }
            if (find(`${c.name} token symbol '${t.symbol}'`, t.symbol)) {
              this.we.filtered = true
            }
            if (find(`${c.name} token '${t.symbol}' address`, t.address)) {
              this.we.filtered = true
            }
            if (find(`${c.name} token '${t.symbol}' balance`, t.balance)) {
              this.we.filtered = true
            }
          }
        }
      }

      return Promise.all(promises)
    }

    private applyOperatorAnd(walletFilter: wlt.WalletFilter, register: WalletSearchTracker) {
      let find = register.find

      let promises: Promise<any>[] = []

      let queryTokens = Array.from(walletFilter.queryTokens)

      let detection = find('account', this.we.account)
          || find('account name', this.we.name)
          || find('account label', this.we.visibleLabel)
          || find('account private label', this.we.label)

      if (detection)  queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())

      if ((this.we.filtered = (queryTokens.length == 0))) return Promise.all(promises)

      let doFind = (queryTokens: string[], name: string, item: string, exact?: boolean) => {
        let detection = find(name, item, exact)
        return detection
            ? queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            : queryTokens
      }

      // find currency address label
      promises.push(getSubEntryVisibleLabelList(this.we.account).then(labels => {
        for (let label of labels) {
          queryTokens = doFind(queryTokens, `${this.we.account} address label`, label)
        }
      }))

      if ((this.we.filtered = (queryTokens.length == 0))) return Promise.all(promises)

      let currencySymbolDetected = false
      let entryCurrencySymbols = Array.from(this.we.selectedCurrencies)
      entryCurrencySymbols.push(wlt.CURRENCIES.HEAT.symbol)

      const findInCurrency = (currencySymbol) => {
        if (!this.we.secretPhrase) return
        let c = wlt.SYM_CURRENCIES_MAP.get(currencySymbol)
        for (let a of (this.we.getCryptoAddresses(currencySymbol)?.addresses || [])) {
          queryTokens = doFind(queryTokens,`${c.name} #${typeof a.index === "number" ? a.index : ''}`, a.address)
          // search in cached transactions
          promises.push(
              this.findInTransactions(find, queryTokens, c, a).then(queryTokensUpdated => queryTokens = queryTokensUpdated)
          )
        }

        //find tokens, balances in CurrencyBalance
        let cb = this.we.findCurrencyBalance(currencySymbol)
        if (cb) {
          queryTokens = doFind(queryTokens,`${cb.name} balance`, cb.balance)
          for (let t of (cb.tokens || [])) {
            queryTokens = doFind(queryTokens,`${c.name} token '${t.symbol}'`, t.name)
            queryTokens = doFind(queryTokens,`${c.name} token symbol '${t.symbol}'`, t.symbol)
            queryTokens = doFind(queryTokens,`${c.name} token '${t.symbol}' address`, t.address)
            queryTokens = doFind(queryTokens,`${c.name} token '${t.symbol}' balance`, t.balance)
          }
        }
      }

      for (let c of entryCurrencySymbols) {
        let currencyName = wlt.SYM_CURRENCIES_MAP.get(c).name
        detection = find('currency', c, true) || find('currency', currencyName)
        if (detection) {
          currencySymbolDetected = true
          queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
          findInCurrency(c)
        }
      }
      // no any currency symbol in query, so search addresses not grouped by currency
      if (!currencySymbolDetected) {
        for (let c of entryCurrencySymbols) {
          findInCurrency(c)
        }
      }

      this.we.filtered = (queryTokens.length == 0)

      return Promise.all(promises)
    }

    toString(): string {
      return `${this.we.account} ${this.we.name || ''}`
    }

  }

}
