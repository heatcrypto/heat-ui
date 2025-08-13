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
      let page = 0
      let store = wlt.getStore('currency-cache-' + currency.symbol.toLowerCase())
      while (page < 100500) {
        let txsPage: any[] = store.get(a.address + '-' + page)
        if (!txsPage) break
        for (const tx of txsPage) {
          //find tx id
          let txId = tx.hash || tx.txid
          let detection = find(`Transaction ${currency.name} #${typeof a.index === "number" ? a.index : ''}`, txId)
          if (detection) {
            isFind = true
            queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
          }
          //find payment memo
          let localPaymentMessages: {method: number, text: string} = tx.message
          if (localPaymentMessages?.text) {
            detection = find(`Payment memo ${currency.name} #${typeof a.index === "number" ? a.index : ''}`, localPaymentMessages.text)
            if (detection) {
              isFind = true
              queryTokens = queryTokens?.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }
          }
        }
        page++
      }
      if (queryTokens == null) return isFind  //for applying OR operator
      return queryTokens  //for applying AND operator
    }

    apply(walletFilter: WalletFilter, logicalOperator: 'and' | 'or') {
      let registry = this.trackFinds(walletFilter)
      this.we.filtered = false
      if (logicalOperator == "or") this.applyOperatorOr(walletFilter, registry)
      if (logicalOperator == "and") this.applyOperatorAnd(walletFilter, registry)
      if (registry.finds.size > 0) {
        //console.log(this.walletEntry.account, this.walletEntry.filtered, registry.finds)
        return registry.finds
      }
    }

    private applyOperatorOr(walletFilter: wlt.WalletFilter, registry: WalletSearchTracker) {
      let find = registry.find

      this.we.filtered = !!(find('account', this.we.account)
          || find('account name', this.we.name)
          || find('account label', this.we.visibleLabel)
          || find('account private label', this.we.label))

      // find currency addresses labels
      let labels = wlt.getEntryVisibleLabelList(this.we.account)
      for (let label of labels) {
        if (find(`${this.we.account} address label`, label)) {
          this.we.filtered = true
        }
      }

      //this.walletEntry.selectedCurrencies = wlt.getStore().get(this.walletEntry.account) || []
      if (this.we.selectedCurrencies.length > 0) {
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
              if (this.findInTransactions(find, null, c, a)) {
                this.we.filtered = true
              }
            }
          }
        }
      }
    }

    private applyOperatorAnd(walletFilter: wlt.WalletFilter, register: WalletSearchTracker) {
      let find = register.find

      let queryTokens = Array.from(walletFilter.queryTokens)

      let detection = find('account', this.we.account)
          || find('account name', this.we.name)
          || find('account label', this.we.visibleLabel)
          || find('account private label', this.we.label)

      if (detection)  queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())

      if ((this.we.filtered = (queryTokens.length == 0))) return

      // find currency address label
      let findCurrencyAddressLabel = (account: string) => {
        let labels = wlt.getEntryVisibleLabelList(account)
        for (let label of labels) {
          detection = find(`${this.we.account} address label`, label)
          if (detection) {
            queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
          }
        }
      }

      findCurrencyAddressLabel(this.we.account)

      if ((this.we.filtered = (queryTokens.length == 0))) return

      let currencySymbolDetected = false
      let entryCurrencySymbols: string[] = wlt.getStore().get(this.we.account)

      if (entryCurrencySymbols?.length > 0) {

        const findAddresses = (currencySymbol) => {
          if (!this.we.secretPhrase) return
          let c = wlt.SYM_CURRENCIES_MAP.get(currencySymbol)
          for (let a of (this.we.getCryptoAddresses(currencySymbol)?.addresses || [])) {
            detection = find(`${c.name} #${typeof a.index === "number" ? a.index : ''}`, a.address)
            if (detection) {
              queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            }

            // search in cached transactions
            queryTokens = this.findInTransactions(find, queryTokens, c, a)
          }
        }

        for (let c of entryCurrencySymbols) {
          let currencyName = wlt.SYM_CURRENCIES_MAP.get(c).name
          detection = find('currency', c, true) || find('currency', currencyName)
          if (detection) {
            currencySymbolDetected = true
            queryTokens = queryTokens.filter(v => v.toUpperCase() != detection.token.toUpperCase())
            findAddresses(c)
          }
        }
        // no any currency symbol in query, so search addresses not grouped by currency
        if (!currencySymbolDetected) {
          for (let c of entryCurrencySymbols) {
            findAddresses(c)
          }
        }
      }

      if ((this.we.filtered = (queryTokens.length == 0))) return
    }

    toString(): string {
      return `${this.we.account} ${this.we.name || ''}`
    }

  }

}
