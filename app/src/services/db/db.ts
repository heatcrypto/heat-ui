namespace storage {

    let initDb = (name: string) => {
        let db = new globalThis.Dexie(name)

        db.version(1).stores({
            walletEntry: 'account, name', // optional name of account, for example road@heatwallet.com
            cryptoAddresses: '[account+currencySymbol]',
            walletItem: '[account+itemKey]', //name is name of item subEntry, for example hash of currency address
            transactionMemo: 'id' // id (PK), content: any
        })

        db.open().catch(error => console.error("Failed to open database:", error))
        return db
    }

    export const dbMainnet = initDb("Heatwallet")
    export const dbTestnet = initDb("Heatwallet-testnet")

    export const db = heat.isTestnet ? dbTestnet : dbMainnet

    export function importAddresses(isTestnet: boolean, account: string, currencySymbol: string, addresses: any): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.cryptoAddresses.put({account, currencySymbol, addresses}).then(id => {
            console.log(`addresses added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function importWalletRecord(isTestnet: boolean, account: string, contents: string, name: string): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletEntry.add({account, name, contents}).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function updateWalletEntry(isTestnet: boolean, account: string, props: any): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletEntry.update(account, props).catch(error => {
            console.error("Error updating record:", error)
        })
    }

    export function importWalletLabel(isTestnet: boolean, account: string, itemKey: string, label: string): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletItem.put({account: account, itemKey: itemKey, label: label}).then(id => {
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
