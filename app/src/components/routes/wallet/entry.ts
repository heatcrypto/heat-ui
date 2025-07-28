namespace wlt {

    export abstract class EntryAbstract {
        public visible = false
        /**
         * if not null the filter is enabled
         */
        public filtered = null
        public hidden = false

        displayed() {
            return this.visible && !this.hidden && this.filtered != false
        }
    }

    export abstract class SubEntryAbstract extends EntryAbstract{

        public walletEntry: WalletEntry

        displayed() {
            return super.displayed() && this.walletEntry.displayed()
        }

    }

    export class TokenBalance extends SubEntryAbstract {
        public isTokenBalance = true
        public balance: string

        constructor(public walletEntry: WalletEntry, public name: string, public symbol: string, public address: string) {
            super()
        }
    }

    export class CurrencyBalance extends SubEntryAbstract {

        static hasNoZeroDigit = /[1-9]/  // test is string (balance) has any not zero digit (is balance no zero)
        static hasDigit = /[0-9]/  // test is string (balance) has any not zero digit (is balance no zero)
        public isCurrencyBalance = true
        public inUse = false
        public pubKey: string
        public tokens: Array<TokenBalance> = []
        public stateMessage: string
        private _balance: string

        constructor(public name: string, public symbol: string, public address: string, public secretPhrase: string, public index?: number) {
            super()
        }

        get balance(): string {
            let result
            if (this.isCurrencyBalance && this.symbol) {
                let r = getSavedCurrencyBalance(this.address, this.symbol, this._balance)
                result = r?.confirmed
            } else {
                result = this._balance
            }
            return CURRENCIES_MAP.get(this.name).formatBalance(result)
        }

        set balance(value: string) {
            this._balance = value;
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
            return !CurrencyBalance.hasNoZeroDigit.test(this._balance)
        }

        public hasDigit() {
            return CurrencyBalance.hasDigit.test(this._balance)
        }

    }

    export class CurrencyAddressLoading extends SubEntryAbstract {
        public isCurrencyAddressLoading = true
        public walletAddresses: WalletAddresses
        public address: string
        public currencySymbol: string

        constructor(public name: string, public walletEntry: WalletEntry) {
            super()
            this.currencySymbol = CURRENCIES_MAP.get(name)?.symbol
        }
    }

    export class CurrencyAddressCreate extends SubEntryAbstract {
        public isCurrencyAddressCreate = true
        public hidden = true
        public currencySymbol: string

        public flatten: () => void

        constructor(public name: string, public walletAddresses: WalletAddresses, public walletEntry: WalletEntry) {
            super()
            this.currencySymbol = CURRENCIES_MAP.get(name)?.symbol
            isLimitReached(getCurrencyBalances(this.walletEntry, this.name))
        }

        private getCurrencies(account: string): string[] {
            let currencies = getStore().get(account)
            return currencies || []
        }

        private registerCurrency(account: string, currency: string) {
            let currencies = this.getCurrencies(account)
            if (currencies.indexOf(currency) > -1) return
            currencies.push(currency)
            getStore().put(account, currencies.filter(wlt.distinctValues))
        }

        removeIsDeleted(entry) {
            let currencySymbol = entry.symbol
            let account = entry.walletEntry.account
            let walletType = getCryptoAddresses(entry.walletEntry, currencySymbol)
            walletType.addresses.forEach(walletAddress => {
                if (walletAddress.address === entry.address)
                    delete walletAddress['isDeleted']
            })
            saveCryptoAddresses(entry.walletEntry, currencySymbol, walletType)
        }

        createAddressByName() {
            let walletEntry = this.findWalletEntry(this)
            if (this.name == "Bitcoin") return this.createBtcAddress(walletEntry)
            if (this.name == "Ethereum") return this.createEthAddress(walletEntry)
            if (this.name == "FIMK") return this.createFIMKAddress(walletEntry)
            if (this.name == "NXT") return this.createNXTAddress(walletEntry)
            if (this.name == "ARDOR") return this.createARDRAddress(walletEntry)
            if (this.name == "Litecoin") return this.createLtcAddress(walletEntry)
            if (this.name == "BitcoinCash") return this.createBchAddress(walletEntry)
        }

        findWalletEntry(entry) {
            while (entry && !entry.isWalletEntry) {
                entry = entry.walletEntry || entry.parent
            }
            return entry?.isWalletEntry ? entry : null
        }

        findNextAddress(currencySymbol, addresses: WalletAddresses, lastAddress: string, component: WalletComponentAbstract, walletEntry: WalletEntry): WalletAddress {
            let i = lastAddress
                ? addresses.addresses.findIndex(value => value.address == lastAddress) + 1
                : 0
            if (i < addresses.addresses.length) {
                let nextAddress = addresses.addresses[i]
                if (nextAddress.isDeleted) {
                    nextAddress.isDeleted = false
                    saveCryptoAddresses(walletEntry, currencySymbol, addresses)
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
            return BTCCurrency.requestBtcAddressType(entry, 'Bitcoin')
                .then(wa => this.createAddress(entry, 'Bitcoin', 'BTC', wa))
        }

        createLtcAddress(entry: WalletEntry) {
            return this.createAddress(entry, 'Litecoin', 'LTC')
        }

        createBchAddress(entry: WalletEntry) {
            return this.createAddress(entry, 'BitcoinCash', 'BCH')
        }

        createFIMKAddress(entry: WalletEntry) {
            return this.createAddress(entry, 'FIMK', 'FIM')
        }

        createNXTAddress(entry: WalletEntry) {
            return this.createAddress(entry, 'NXT', 'NXT')
        }

        createARDRAddress(entry: WalletEntry) {
            return this.createAddress(entry, 'ARDOR', 'ARDR')
        }

        createAddress(entry: WalletEntry, currencyName: string, currencySymbol: string, candidateAddress?: WalletAddress) {
            let component: WalletComponentAbstract = entry.component
            let currencies = this.walletEntry.currencies

            if (candidateAddress?.index != undefined) {
                this.walletAddresses.addresses[candidateAddress.index] = candidateAddress
            }

            // collect all CurrencyBalance of 'our' same currency type
            // @ts-ignore
            let currencyBalances = getCurrencyBalances(this.walletEntry, this.name)

            if (isLimitReached(currencyBalances)) {
                component.showMessage("Limit of empty addresses is reached")
                return
            }

            // determine the first address based of the last currencyBalance displayed
            let lastAddress = currencyBalances.length == 0
                ? null
                : currencyBalances[currencyBalances.length - 1].address

            let nextAddress = candidateAddress || this.findNextAddress(currencySymbol, this.walletAddresses, lastAddress, component, entry)

            if (nextAddress) {
                nextAddress.isDeleted = false
                rememberCryptoAddressCreated(this.walletEntry, currencySymbol, nextAddress)
                let newCurrencyBalance = new CurrencyBalance(currencyName, currencySymbol, nextAddress.address, nextAddress.privateKey, nextAddress.index)
                newCurrencyBalance.walletEntry = component.walletEntries.find(c => c.account == this.walletEntry.account)
                //rememberAddressCreated(this.walletEntry.account, nextAddress.address)
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

                component.flatten()

                /*
                // requestBalance(currencyName)
                if (currencyName == "Ethereum") {
                  let ethCurrencyAddressLoading = new CurrencyAddressLoading('Ethereum')
                  ethCurrencyAddressLoading.visible = entry.visible
                  ethCurrencyAddressLoading.wallet = this.wallet
                  currencies.push(ethCurrencyAddressLoading)
                  component.loadEthereumAddresses(this.walletEntry)
                }
                setTimeout(() => this.flatten(), 1000)
                 */

                shouldBeSaved = component.exportWallet(true)

                return newCurrencyBalance
            }
        }

        // private requestBalance(currencyName) {
        //
        //   if (currencyName == "Ethereum") {
        //     let lightwalletService = <LightwalletService>heat.$inject.get('lightwalletService')
        //     lightwalletService.refreshBalances()
        //   }
        //
        // }

    }

}
