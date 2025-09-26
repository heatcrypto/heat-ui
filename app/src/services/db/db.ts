namespace storage {

    let initDb = (name: string) => {
        let db = new globalThis.Dexie(name)

        db.version(1).stores({
            walletEntry: 'account, name', // optional name of account, for example road@heatwallet.com
            cryptoAddresses: '[account+currencySym]',
            walletItem: '[itemKey+currencySym], account', //itemKey is id of subEntry, for example hash of currency address (subEntry currency balance)
            transactionMemo: 'id' // id (PK), content: any
        })

        db.open().catch(error => console.error("Failed to open database:", error))
        return db
    }

    export const dbMainnet = initDb("Heatwallet")
    export const dbTestnet = initDb("Heatwallet-testnet")

    export const db = heat.isTestnet ? dbTestnet : dbMainnet

    export function compactHash(str: string): string {
        return converters.byteArrayToHexString(heat.crypto.hexToHash8Bytes(str))
    }

    export function getCryptoAddresses(account: string, currencySym: string): Promise<any> {
        return db.cryptoAddresses.get({account, currencySym}).catch(error => {
            console.error(error)
        })
    }

    export function putCryptoAddresses(account: string, currencySym: string, addresses): Promise<any> {
        return db.cryptoAddresses.put({account, currencySym, addresses}).catch(error => {
            console.error(error)
        })
    }

    export function updateBalance(itemKey: string, currencySym: string, balance): Promise<any> {
        return db.walletItem.update({itemKey, currencySym}, {balance}).catch(error => {
            console.error(error)
        })
    }

    export function importAddresses(isTestnet: boolean, account: string, currencySym: string, addresses: any): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.cryptoAddresses.put({account, currencySym, addresses}).then(id => {
            console.log(`addresses added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function importWalletEntry(isTestnet: boolean, account: string, name: string, contents: string): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletEntry.add({account, name, contents}).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function importWalletEntryProps(isTestnet: boolean, account: string, props: any): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletEntry.update(account, props).catch(error => {
            console.error("Error updating record:", error)
        })
    }

    export function saveWalletEntry(account: string, name: string, contents: string): Promise<any> {
        return db.walletEntry.get({account}).then(item => {
            if (item) {
                return db.walletEntry.update({account}, {name, contents})
            } else {
                return db.walletEntry.put({account, name, contents})
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function removeWalletEntry(account: string): Promise<any> {
        return db.walletEntry.delete({account}).catch(error => console.error("Error saving record:", error))
    }

    export function listWalletEntries(): Promise<any[]> {
        return db.walletEntry.toArray().catch(error => console.error("Error adding record:", error))
    }

    export function getWalletEntry(account: string): Promise<any> {
        return db.walletEntry.get({account}).catch(error => {
            console.error("Error getting wallet entry:", error)
        })
    }

    export function saveItemLabel(itemKey: string, currencySym: string, account: string = '', label: string): Promise<any> {
        return db.walletItem.get({itemKey, currencySym}).then(item => {
            if (item) {
                return db.walletItem.update({itemKey: itemKey, currencySym}, {label: label})
            } else {
                return db.walletItem.put({itemKey: itemKey, currencySym, label: label})
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function getItemLabel(itemKey: string, currencySym: string): Promise<any> {
        return db.walletItem.get({itemKey, currencySym}).then(item => {
            return item?.label
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function importWalletLabel(isTestnet: boolean, account: string, itemKey: string, currencySym: string, label: string): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletItem.put({itemKey: itemKey, currencySym, account: account, label: label}).then(id => {
            console.log(`wallet label added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function importTransactionMemo(isTestnet: boolean, id: string, content: any): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.transactionMemo.put({id, content}).then(id => {
            console.log(`transaction memo added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

}
