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
            contact: '[ownerAccount+publicKey]', //ownerAccount owner of contact, public key of contact
            message: '[ownerAccount+msgId], [ownerAccount+roomKey], [ownerAccount+roomKey+timestamp]', //p2p (u2u) message. ownerAccount is the sender of outgoing message or recipient of incoming message
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

    export function removeValue(key: string): Promise<any> {
        return db0.values.where('key').equals(key).delete().catch(error => console.error(error))
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
        let promises = []
        promises.push(
            db0.cryptoAddresses
                .where('account').equals(account)
                .delete()
        )
        promises.push(
            db0.contact
                .where('account').equals(account)
                .delete()
        )
        promises.push(
            db0.walletEntry.delete(account)
        )
        return Promise.all(promises).catch(error => console.error(`Deletion failed: ${error}`))
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

    export function putContact(ownerAccount: string, publicKey: string, value: any): Promise<any> {
        let c = Object.assign(value, {ownerAccount: ownerAccount, publicKey: publicKey})
        if (!c.account) c.account = heat.crypto.getAccountIdFromPublicKey(c.publicKey)
        return db0.contact.put(c).catch(error => {
            console.error(error)
        })
    }

    export function saveContact(ownerAccount: string, publicKey: string, props: any): Promise<any> {
        let id = {ownerAccount: ownerAccount, publicKey}
        return db0.contact.get(id).then(c => {
            if (c) {
                return db0.contact.update(id, props)
            } else {
                return putContact(ownerAccount, publicKey, props)
            }
        }).catch(error => {
            console.error("Error saving record:", error)
        })
    }

    export function getContact(ownerAccount: string, publicKey: string): Promise<any> {
        return db0.contact.get({ownerAccount: ownerAccount, publicKey: publicKey}).catch(error => {
            console.error(error)
        })
    }

    /**
     * list account's contacts
     * @param ownerAccount holder of contacts
     */
    export function listContacts(ownerAccount: string): Promise<any> {
        return db0.contact.where({ownerAccount: ownerAccount}).toArray().catch(error => {
            console.error(error)
        })
    }

    export function searchContacts(contactAccountQuery?: string, publicNameQuery?: string): Promise<any> {
        if (contactAccountQuery) {
            return db0.contact.filter(c => c.account.includes(contactAccountQuery)).toArray()
                .catch(error => {console.error(error)})
            // return db0.contact.where('ownerAccount').startsWith(contactAccountQuery).toArray()
            //     .catch(error => {console.error(error)})
        }
        if (publicNameQuery) {
            return db0.contact.filter(c => c.publicName.includes(publicNameQuery)).toArray()
                .catch(error => {console.error(error)})
        }
    }

    export function removeContact(ownerAccount: string, publicKey: string): Promise<any> {
        return db0.contact.delete(ownerAccount, publicKey).catch(error => console.error("Deletion failed:", error))
    }

    // -------- P2P Messaging ----------------------------------------------------------------

    export function addMessage(ownerAccount, message: any): Promise<any> {
        return db0.message.add(Object.assign(message, {ownerAccount})).catch(error => {
            console.error(error)
        })
    }

    export function updateMessage(ownerAccount, msgId: string, props: any): Promise<any> {
        return db0.message.update({ownerAccount, msgId}, props).catch(error => {
            console.error("Error updating record:", error)
        })
    }

    export function getMessage(ownerAccount, msgId: string): Promise<any> {
        return db0.message.get({ownerAccount, msgId}).catch(error => {
            console.error("Deletion failed:", error)
        })
    }

    export function getMessages(ownerAccount, roomKey: string): Promise<any> {
        return db0.message
            .where('[ownerAccount+roomKey+timestamp]').between([ownerAccount, roomKey, -Number.MAX_VALUE],[ownerAccount, roomKey, Number.MAX_VALUE])
            .toArray()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function getMessagesScrollable(ownerAccount, roomKey: string, offset: number, limit: number): Promise<any> {
        return db0.message
            .where('[ownerAccount+roomKey+timestamp]').between([ownerAccount, roomKey, -Number.MAX_VALUE],[ownerAccount, roomKey, Number.MAX_VALUE])
            .offset(offset).limit(limit).toArray()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function getMessagesCount(ownerAccount, roomKey: string): Promise<any> {
        return db0.message
            .where('[ownerAccount+roomKey+timestamp]').between([ownerAccount, roomKey, -Number.MAX_VALUE],[ownerAccount, roomKey, Number.MAX_VALUE])
            .count()
            .catch(error => {console.error("Error getting records:", error)})
    }

    export function removeMessage(ownerAccount, msgId: string): Promise<any> {
        return db0.message.delete({ownerAccount, msgId}).catch(error => console.error("Deletion failed:", error))
    }

    export function removeMessages(ownerAccount, roomKey: string): Promise<any> {
        return db0.message
            .where('[ownerAccount+roomKey]').equals([ownerAccount, roomKey])
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
