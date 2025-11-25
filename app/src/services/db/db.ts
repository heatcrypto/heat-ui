namespace db {

    export let dbMainnet
    export let dbTestnet
    export let db0

    let initDb = (name: string) => {
        let dexie = new globalThis.Dexie(name)

        dexie.version(1).stores({
            values: 'key',  // todo split key to 3 keys key0, key1, key2. Compound primary key [key0+key1+key2].
                            // Example: key0='unread-state', key1='643537283892', key1='3477a5e34874ff'
                            // Easy query by any of keys
            walletEntry: 'account, name', // optional name of account, for example road@heatwallet.com
            cryptoAddresses: '[account+currencySym]',
            walletItem: '[itemKey+currencySym], parent', //itemKey is id of subEntry, for example hash of currency address (subEntry currency balance)
            transactionMemo: 'id', // id (PK), content: any
            contact: '[account+pubKey]', //account's contact public key
            message: 'msgId, [roomKey+timestamp]', //u2u (p2p) message
        })

        dexie.open().catch(error => console.error("Failed to open database:", error))
        return dexie
    }

    let superInit = () => {
        dbMainnet = initDb("Heatwallet")
        dbTestnet = initDb("Heatwallet-testnet")
        return db0 = heat.isTestnet ? dbTestnet : dbMainnet
    }

    superInit()

    export function compactHash(str: string): string {
        return converters.byteArrayToHexString(heat.crypto.hexToHash8Bytes(str))
    }

    export function bytesToCompactHash(bytes: number[]): string {
        return converters.byteArrayToHexString(heat.crypto.bytesToHash8Bytes(bytes))
    }

    export function getValue(key: string): Promise<any> {
        return db0.values.get(key).catch(error => {
            console.error(error)
        })
    }

    export function putValue(key: string, value: any): Promise<any> {
        return db0.values.put({key, value}).catch(error => {
            console.error(error)
        })
    }

    export function getValuesStartWith(keyPrefix: string): Promise<any> {
        return db0.values.where('key').startsWith(keyPrefix).toArray().catch(error => {
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

    export function walletEntryCount(): Promise<number> {
        return db0.walletEntry.count().catch(error => {
            console.error("Error count record:", error)
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
        return db0.walletEntry.delete(account).catch(error => console.error("Error on deleting record:", error))
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
            console.error("Error getting record:", error)
        })
    }

    // -------- P2P Messaging Contacts ----------------------------------------------------------------

    export function putContact(account: string, pubKey: string, value: any): Promise<any> {
        return db0.contact.put(Object.assign(value, {account, pubKey})).catch(error => {
            console.error(error)
        })
    }

    export function saveContact(account: string, pubKey: string, props: any): Promise<any> {
        let id = {account, pubKey}
        return db0.contact.get(id).then(c => {
            if (c) {
                return db0.contact.update(id, props)
            } else {
                return putContact(account, pubKey, props)
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function getContact(account: string, pubKey: string): Promise<any> {
        return db0.contact.get({account, pubKey}).catch(error => {
            console.error(error)
        })
    }

    /**
     * list account's contacts
     * @param account holder of contacts
     */
    export function listContacts(account: string): Promise<any> {
        return db0.contact.where({account}).toArray().catch(error => {
            console.error(error)
        })
    }

    export function searchContacts(accountQuery?: string, publicNameQuery?: string): Promise<any> {
        if (accountQuery) {
            return db0.contact.where('account').startsWith(accountQuery).toArray()
                .catch(error => {console.error(error)})
        }
        if (publicNameQuery) {
            return db0.contact.filter(c => c.publicName.includes(publicNameQuery)).toArray()
                .catch(error => {console.error(error)})
        }
    }

    export function removeContact(account: string, pubKey: string): Promise<any> {
        return db0.contact.delete(account, pubKey).catch(error => console.error("Deletion failed:", error))
    }

    // -------- P2P Messaging ----------------------------------------------------------------

    export function addMessage(message: any): Promise<any> {
        return db0.message.add(message).catch(error => {
            console.error(error)
        })
    }

    export function getMessage(msgId: string): Promise<any> {
        return db0.message.get(msgId).catch(error => {
            console.error("Deletion failed:", error)
        })
    }

    export function getMessages(roomKey: string): Promise<any> {
        return db0.message
            .where('[roomKey+timestamp]').between([roomKey, -Number.MAX_VALUE],[roomKey, Number.MAX_VALUE])
            .toArray()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function getMessagesScrollable(roomKey: string, offset: number, limit: number): Promise<any> {
        return db0.message
            .where('[roomKey+timestamp]').between([roomKey, -Number.MAX_VALUE],[roomKey, Number.MAX_VALUE])
            .offset(offset).limit(limit).toArray()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function getMessagesCount(roomKey: string): Promise<any> {
        return db0.message
            .where('[roomKey+timestamp]').between([roomKey, -Number.MAX_VALUE],[roomKey, Number.MAX_VALUE])
            .count()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function updateMessage(msgId: string, props: any): Promise<any> {
        return db0.message.update(msgId, props).catch(error => {
            console.error("Error updating record:", error)
        })
    }

    export function removeMessage(msgId: string): Promise<any> {
        return db0.message.delete(msgId).catch(error => console.error("Deletion failed:", error))
    }

    export function removeMessages(roomKey: string): Promise<any> {
        return db0.message
            .where('roomKey').equals(roomKey)
            .delete()
            .catch(error => console.error(`Bulk deletion failed: ${error}`))
    }

// --------------------------------------------------------------------------------

    export function exportDatabase(): Promise<Blob> {
        return db0.export()
    }

    export function importDatabase(blob): Promise<any> {
        return db0.import(blob)
    }

    export function checkDatabaseEmpty(): Promise<any> {
        return db0.walletEntry.count().then(n => n == 0)
    }

    export function deleteDatabase() {
        return db0.delete().then(() => superInit())
    }
}
