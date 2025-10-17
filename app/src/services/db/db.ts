namespace db {

    let initDb = (name: string) => {
        let dexie = new globalThis.Dexie(name)

        dexie.version(1).stores({
            values_v2: '',
            walletEntry: 'account, name', // optional name of account, for example road@heatwallet.com
            cryptoAddresses: '[account+currencySym]',
            walletItem: '[itemKey+currencySym], parent', //itemKey is id of subEntry, for example hash of currency address (subEntry currency balance)
            transactionMemo: 'id' // id (PK), content: any
        })

        dexie.open().catch(error => console.error("Failed to open database:", error))
        return dexie
    }

    export const dbMainnet = initDb("Heatwallet")
    export const dbTestnet = initDb("Heatwallet-testnet")

    export const db0 = heat.isTestnet ? dbTestnet : dbMainnet

    export function compactHash(str: string): string {
        return converters.byteArrayToHexString(heat.crypto.hexToHash8Bytes(str))
    }

    export function getValue(key: string): Promise<any> {
        return db0.values_v2.get(key).catch(error => {
            console.error(error)
        })
    }

    export function putValue(key: string, value: any): Promise<any> {
        return db0.values_v2.put(value, key).catch(error => {
            console.error(error)
        })
    }

    export function getCryptoAddresses(account: string, currencySym: string): Promise<any> {
        return db0.cryptoAddresses.get({account, currencySym}).catch(error => {
            console.error(error)
        })
    }

    export function putCryptoAddresses(account: string, currencySym: string, addresses): Promise<any> {
        return db0.cryptoAddresses.put({account, currencySym, addresses}).catch(error => {
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

    export function saveWalletEntry(account: string, props: any): Promise<any> {
        return db0.walletEntry.get({account}).then(item => {
            if (item) {
                return db0.walletEntry.update(account, props)
            } else {
                return db0.walletEntry.put(Object.assign({account}, props))
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function updateWalletEntryProps(account: string, props: any): Promise<any> {
        return db0.walletEntry.update(account, props).catch(error => {
            console.error("Error updating record:", error)
        })
    }

    export function removeWalletEntry(account: string): Promise<any> {
        //todo remove derived records (addresses, walletItem ...) also
        return db0.walletEntry.delete(account).catch(error => console.error("Error saving record:", error))
    }

    export function listWalletEntries(): Promise<any[]> {
        return db0.walletEntry.toArray().catch(error => console.error("Error adding record:", error))
    }

    export function getWalletEntry(account: string): Promise<any> {
        return db0.walletEntry.get({account}).catch(error => {
            console.error("Error getting wallet entry:", error)
        })
    }

    export function updateBalance(itemKey: string, currencySym: string, balance): Promise<any> {
        return db0.walletItem.update({itemKey, currencySym}, {balance}).catch(error => {
            console.error(error)
        })
    }

    export function saveWalletItem(itemKey: string, currencySym: string, props: any): Promise<any> {
        let id = {itemKey, currencySym}
        return db0.walletItem.get(id).then(item => {
            if (item) {
                return db0.walletItem.update(id, props)
            } else {
                return db0.walletItem.put(Object.assign(id, props))
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function updateWalletItem(itemKey: string, currencySym: string, props: any): Promise<any> {
        let id = {itemKey, currencySym}
        return db0.walletItem.update(id, props).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function getWalletItem(itemKey: string, currencySym: string): Promise<any> {
        return db0.walletItem.get({itemKey, currencySym}).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function saveItemLabel(itemKey: string, currencySym: string, parent, label: string): Promise<any> {
        return db0.walletItem.get({itemKey, currencySym}).then(item => {
            if (item) {
                return db0.walletItem.update({itemKey: itemKey, currencySym}, {label: label, parent: parent})
            } else {
                return db0.walletItem.put({itemKey: itemKey, currencySym, label: label, parent: parent})
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function getItemLabel(itemKey: string, currencySym: string): Promise<any> {
        return db0.walletItem.get({itemKey, currencySym}).then(item => {
            return item?.label
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function listWalletItems(parent: string): Promise<any> {
        return db0.walletItem.where('parent').equals(parent).toArray()
            .catch(error => console.error("Error get records:", error))
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

    export function putTransactionMemo(id: string, content: any): Promise<any> {
        return db0.transactionMemo.put({id, content}).catch(error => {
            console.error("Error putting record:", error)
        })
    }

    export function getTransactionMemo(id: string): Promise<any> {
        return db0.transactionMemo.get(id).catch(error => {
            console.error("Error adding record:", error)
        })
    }

}
