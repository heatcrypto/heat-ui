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
                public component: WalletComponentAbstract //user may assign any text for wallet account
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

    initBTC(walletComponent: WalletComponentAbstract, wallet: WalletType, user: UserService) {
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

    initEth(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initIota(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initFIMK(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initNXT(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initARDOR(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initLTC(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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

    initBCH(walletComponent: WalletComponentAbstract, wallet: WalletType) {
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
