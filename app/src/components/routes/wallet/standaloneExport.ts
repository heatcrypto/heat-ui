// draft

namespace wltStandalone {

    export function exportWallet(onlyData?: boolean) {
        let accountCurrencies: Map<string, []> = new Map<string, []>()
        this.entries.forEach(entry => {
            if (entry instanceof wlt.WalletEntry) {
                let currencies: [] = this.store.get(entry.account)
                if (currencies) accountCurrencies.set(entry.account, currencies)
            }
        })

        // convert
        // [[account, Set],[account, Set],...]
        // to
        // [[account, [address1, address2,...]],[account, [address1, address2,...]],...]
        let accountAddressesArray = Object.entries(wlt.createdAddresses) // [[account, Set],[account, Set],...]
        let accountAddresses = accountAddressesArray
            .map(item => [item[0], Array.from(item[1])])
            .filter(v => v[1]?.length > 0)

        // @ts-ignore
        let exported = exportInternal(accountCurrencies, accountAddresses)
        let paymentMessages = wlt.exportPaymentMessages()
        exported = Object.assign(exported, {paymentMessages: paymentMessages})

        let encoded = this.walletFile.encode(exported);
        let blob = new Blob([encoded], { type: "text/plain;charset=utf-8" });

        if (onlyData) return blob

        wlt.saveFile(blob, "heat.wallet")
    }


    function exportInternal(accountCurrencies: Map<string, []>,
              accountAddresses: {[account: string]: Array<string>}): IHeatWalletFile {
        let walletFileData : IHeatWalletFile = {
            version: 2,
            entries: [],
            accountAddresses: accountAddresses
        };

        let store = this.storage.namespace('wallet-address', this.$rootScope, true);

        this.listLocalKeyEntries().forEach(entry => {
            let cryptoAddresses: {}
            wlt.CURRENCIES_LIST.forEach(c => {
                let encryptedAddresses = store.get(`${c.symbol}-${entry.account}`)
                if (encryptedAddresses) {
                    cryptoAddresses = cryptoAddresses || {}
                    cryptoAddresses[c.symbol] = encryptedAddresses
                }
            })
            let item: IHeatWalletFileEntry = {
                account: entry.account,
                contents: entry.contents,
                isTestnet: entry.isTestnet,
                name: entry.name,
                bip44Compatible: wlt.getEntryBip44Compatible(entry.account),
                visibleLabel: wlt.getEntryVisibleLabel(entry.account),
                currencies: accountCurrencies.get(entry.account)
            }
            if (cryptoAddresses) item.cryptoAddresses = cryptoAddresses
            walletFileData.entries.push(item)
        });

        return walletFileData;
    }

    function initLocalKeyStore() {
        // this.entries = []
        let walletEntries = []
        this.localKeyStore.list().map((account: string) => {
            let name = this.localKeyStore.getName(account)
            let walletEntry =  new wlt.WalletEntry(account, name, this)
            walletEntries.push(walletEntry)
        });
        walletEntries.sort((a, b) => {
            return a.account.localeCompare(b.account)
        })
        walletEntries.forEach(walletEntry => {
            let password = this.localKeyStore.getPasswordForAccount(walletEntry.account)
            if (password) {
                try {
                    let key = this.localKeyStore.load(walletEntry.account, password);
                    if (key && !walletEntry["cached"]) {
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

    /*class WalletEntry {
        public isWalletEntry = true
        public selected = true
        public identifier: string
        public visibleLabel: string
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
            this.visibleLabel = getEntryVisibleLabel(this.account)
        }

        setWalletComponent(component: WalletComponentAbstract) {
            this.component = component
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

        private createEntries(currencyName: string, walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            let addressLoading = new CurrencyAddressLoading(currencyName)
            addressLoading.visible = this.expanded;
            addressLoading.wallet = wallet;
            this.currencies.push(addressLoading);

            let currencyAddressCreate: CurrencyAddressCreate =
                <CurrencyAddressCreate><unknown> this.currencies.find(c => c['isCurrencyAddressCreate'] && c.name == currencyName)
            if (!currencyAddressCreate) {
                currencyAddressCreate = new wlt.CurrencyAddressCreate(currencyName, wallet, this, walletComponent)
                currencyAddressCreate.flatten = walletComponent.flatten.bind(walletComponent)
                this.currencies.push(currencyAddressCreate)
            }
        }

        findAddressLoading(currencySymbol: string): wlt.CurrencyAddressLoading {
            let result = this.currencies
                .find(c => {
                    let cal = <wlt.CurrencyAddressLoading>c
                    return cal.isCurrencyAddressLoading && cal.currencySymbol == currencySymbol
                })
            return <wlt.CurrencyAddressLoading>result
        }

        findAddressCreate(currencySymbol: string): wlt.CurrencyAddressCreate {
            let result = this.currencies
                .find(c => {
                    let cal = <wlt.CurrencyAddressCreate>c
                    return cal.isCurrencyAddressCreate && cal.currencySymbol == currencySymbol
                })
            return <wlt.CurrencyAddressCreate>result
        }

        getCryptoAddresses(currencySymbol: string): WalletAddresses {
            return this.findAddressLoading(currencySymbol)?.wallet || this.findAddressCreate(currencySymbol)?.wallet
        }

        initBTC(walletComponent: WalletComponentAbstract, wallet: WalletAddresses, user: UserService) {
            this.createEntries('Bitcoin', walletComponent, wallet)

            walletComponent.flatten()

            if (user.account === this.account) {
                walletComponent.shareCurrencyAddressesWithP2pContacts('BTC', wallet.addresses[0].address)
            }

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadBitcoinAddresses(this)
            }
        }

        initEth(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('Ethereum', walletComponent, wallet)

            walletComponent.flatten()

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadEthereumAddresses(this)
            }
        }

        initIota(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('Iota', walletComponent, wallet)

            walletComponent.flatten()

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadIotaAddresses(this)
            }
        }

        initFIMK(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('FIMK', walletComponent, wallet)

            walletComponent.flatten()

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadFIMKAddresses(this)
            }
        }

        initNXT(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('NXT', walletComponent, wallet)

            if (this.expanded) {
                walletComponent.loadNXTAddresses(this)
            }
        }

        initARDOR(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('ARDOR', walletComponent, wallet)

            if (this.expanded) {
                walletComponent.loadARDORAddresses(this)
            }
        }

        initLTC(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('Litecoin', walletComponent, wallet)

            walletComponent.flatten()

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadLtcAddresses(this)
            }
        }

        initBCH(walletComponent: WalletComponentAbstract, wallet: WalletAddresses) {
            this.createEntries('BitcoinCash', walletComponent, wallet)

            walletComponent.flatten()

            /!* Only if this node is expanded will we load the addresses *!/
            if (this.expanded) {
                walletComponent.loadBitcoinCashAddresses(this)
            }
        }

    }*/
}
