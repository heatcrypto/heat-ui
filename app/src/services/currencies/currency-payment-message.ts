namespace wlt {

    let messageStore: Store
    let heatService: HeatService
    let userService: UserService
    const PAYMENT_MESSAGE_BIRTH_TIME = new Date(2024, 7, 20).getTime()

    export function storePaymentMessage(txId: string, message: string, paymentMessageMethod: number) {
        let user = getUserService()
        let encryptedMessage = heat.crypto.encryptMessage(message, user.publicKey, user.secretPhrase)
        let messageId = createMessageId(txId)

        let sendHeatPaymentMessage = (resolve, reject) => {
            let errorCallback = reason => reject("linked message error: " + JSON.stringify(reason))

            let createKeystoreTransaction = (transactionArgs: IHeatCreateTransactionInput) => {
                return getHeatService().post(
                    "/keystore/put",
                    Object.assign(transactionArgs, {key: messageId, value: JSON.stringify(encryptedMessage)})
                ).then(value => {
                    //assign false to message to indicate that validation (in this app) of appendix message is not needed
                    transactionArgs.message = false
                    return value
                })
            }

            let builder = new TransactionBuilder(new class extends AbstractTransaction {
                verify(transaction: any, attachment: IByteArrayWithPosition, data?: any): boolean {
                    return transaction.type === 1 && transaction.subtype === 0
                }
            })
            builder.secretPhrase(user.secretPhrase)
                .feeNQT(HeatAPI.fee.standard)
                .attachment('ArbitraryMessage', <IHeatCreateArbitraryMessage>{})
                .recipient(user.account)
            builder.create(createKeystoreTransaction)
                .then(value => builder.sign(), errorCallback)
                .then(value => builder.broadcast(), errorCallback)
                .then(value => {
                    if (value.success) {
                        resolve(true)
                    } else {
                        errorCallback.bind(null, value.internalError || value.serverError)
                    }
                }, errorCallback)
                .catch(errorCallback)
        }

        return new Promise((resolve, reject) => {
            if (message) {
                if (paymentMessageMethod == 0) {
                    //store payment message to local storage
                    getPaymentMessageStore().put(messageId, encryptedMessage)
                    resolve(true)
                } else if (paymentMessageMethod == 1) {
                    // random delay to mask the message's time link to the time of original transaction
                    setTimeout(sendHeatPaymentMessage.bind(null, resolve, reject), 10_000 * Math.random())
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }
        })
    }

    export function getHeatUnavailableReason(heatService: HeatService, account: string) {
        return heatService.api.getAccountBalance(account, '0')
            .then(
                (balance: IHeatAccountBalance) => {
                    try {
                        let avail = new Big(balance.unconfirmedBalance)
                        return avail.gte(new Big(HeatAPI.fee.standard)) > 0 ? "" : "insufficient HEAT balance"
                    } catch (e) {
                        return e
                    }
                }, reason => reason)
    }

    export function loadPaymentMessage(txId: string, messageTime: number) {
        let store = getPaymentMessageStore()
        let user = getUserService()
        //message id is seen for everybody so use hash to hide real tx id
        let messageId = createMessageId(txId)

        let decrypt = (encrypted: IEncryptedMessage) => {
            try {
                return heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, user.publicKey, user.secretPhrase)
            } catch (e) {
                return null
            }
        }

        return new Promise<{method: number, text: string}>((resolve, reject) => {
            if (messageTime < PAYMENT_MESSAGE_BIRTH_TIME) resolve(null)

            //first try to load message from local store
            let encryptedMessage: IEncryptedMessage = store.get(messageId)
            if (encryptedMessage) {
                let message = decrypt(encryptedMessage)
                resolve(message ? {method: 0, text: message} : null)
            } else {
                //there is no message in local store so try find the entry in HEAT Keystore
                getHeatService().api.getKeystoreAccountEntry(user.account, messageId).then(response => {
                    let parsed = utils.parseResponse(response)
                    if (!parsed.errorDescription) {
                        let encryptedMessage: IEncryptedMessage = JSON.parse(parsed.value)
                        let message = decrypt(encryptedMessage)
                        resolve(message ? {method: 1, text: message} : null)
                    }
                }, reason => {
                    if (reason.description == "Unknown key") {
                        resolve(null)
                    } else {
                        reject(reason)
                    }
                })
            }
        })
    }

    export function exportPaymentMessages() {
        let store = getPaymentMessageStore()
        return store.keys().map(k => ({id: k, content: store.get(k)}))
    }

    export function importPaymentMessages(items: {id: string, content: any}[]) {
        if (!items) return 0
        let store = getPaymentMessageStore()
        let n = 0
        for (const item of items) {
            store.put(item.id, item.content)
            n++
        }
        return n
    }

    function createMessageId(txId: string) {
        return converters.byteArrayToHexString(
            // @ts-ignore
            hash160(converters.hexStringToByteArray(
                converters.stringToHexString(txId)
            ))
        )
    }

    function getPaymentMessageStore() {
        if (!messageStore) {
            let storage = <StorageService>heat.$inject.get('storage')
            let $rootScope = heat.$inject.get('$rootScope')
            messageStore = storage.namespace("pmt-msg", $rootScope, true)
        }
        return messageStore
    }

    function getHeatService() {
        if (!heatService) {
            heatService = <HeatService>heat.$inject.get('heat')
        }
        return heatService
    }

    function getUserService() {
        if (!userService) {
            userService = <UserService>heat.$inject.get('user')
        }
        return userService
    }

}