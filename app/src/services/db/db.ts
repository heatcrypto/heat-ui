namespace storage {

    let initDb = (name: string) => {
        let db = new globalThis.Dexie(name)

        db.version(3).stores({
            cryptoAddresses: '[account+currencySymbol]',
            walletEntry: 'account, name', // optional name of account, for example road@heatwallet.com
            walletItem: '[account+name]' //name is name of subentry, for example currency address
        })

        db.open().catch(error => console.error("Failed to open database:", error))
        return db
    }

    export const dbMainnet = initDb("Heatwallet")
    export const dbTestnet = initDb("Heatwallet-testnet")

    export const db = heat.isTestnet ? dbTestnet : dbMainnet

    export function putAddresses(account: string, currencySymbol: string, addresses: any): Promise<any> {
        return db.cryptoAddresses.put({account, currencySymbol, addresses}).then(id => {
            console.log(`addresses added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    export function addWalletRecord(account: string, isTestnet: boolean, contents: string, name: string): Promise<any> {
        let actualDb = isTestnet ? dbTestnet : dbMainnet
        return actualDb.walletEntry.add({account, name, contents}).catch(error => {
            console.error("Error adding record:", error)
        })
    }

    /*export function putWalletItemLabel(labelText: string, account: string, itemName: string): Promise<any> {
        return db.walletItem.put({account, currencySymbol, addresses}).then(id => {
            console.log(`addresses added with ID: ${id}`)
            return id
        }).catch(error => {
            console.error("Error adding record:", error)
        })
    }*/


}
