namespace wlt {

    let messageStore: Store
    let heatService: HeatService
    let userService: UserService

    export function sendingPostAction(txId: string, message: string, paymentMessageMethod: number) {
        let user = getUserService()
        let f = (resolve, reject) => {
            let builder = new TransactionBuilder(new class extends AbstractTransaction {
                verify(transaction: any, attachment: IByteArrayWithPosition, data?: any): boolean {
                    return transaction.type === 1 && transaction.subtype === 0
                }
            })
            builder.secretPhrase(user.secretPhrase)
                .feeNQT(HeatAPI.fee.standard)
                .attachment('ArbitraryMessage', <IHeatCreateArbitraryMessage>{})
            builder.recipient(user.account)
            builder.recipientPublicKey(user.publicKey)
            builder.message(`${txId}.${message}`, TransactionMessageType.TO_SELF)
            let errorCallback = reason => reject("linked message error: " + JSON.stringify(reason))
            builder.create()
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
                    let encryptedMessage = heat.crypto.encryptMessage(message, user.publicKey, user.secretPhrase)
                    getPaymentMessageStore().put(txId, encryptedMessage)
                    resolve(true)
                } else if (paymentMessageMethod == 1) {
                    // to mask the message's time link to the time of original transaction
                    setTimeout(f.bind(null, resolve, reject), 20_000 * Math.random())
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

    export function loadPaymentMessage(id: string, messageTime: number) {
        let store = getPaymentMessageStore()
        let user = getUserService()

        return new Promise<{method: number, text: string}>((resolve, reject) => {
            //first try to load message from local store
            let encryptedMessage: IEncryptedMessage = store.get(id)
            if (encryptedMessage) {
                let message = heat.crypto.decryptMessage(
                    encryptedMessage.data, encryptedMessage.nonce, user.publicKey, user.secretPhrase)
                if (message) {
                    resolve({method: 0, text: message})
                } else {
                    resolve(null)
                }
            } else {
                //there is no message in local store so try find the corresponded HEAT message in time range
                let fromTime = messageTime - 600_000
                let toTime = messageTime + 600_000
                getHeatService().api.getMessagingContactMessagesByTimestampRange(
                    user.account, user.account, fromTime, toTime).then(messages => {
                    if (messages?.length > 0) {
                        for (const message of messages) {
                            let content = getHeatService().getHeatMessageContents(message)
                            let pos = content.indexOf(".")
                            if (pos > 0) {
                                let linkedTxId = content.substring(0, pos)
                                if (linkedTxId == id) {
                                    resolve({method: 1, text: content.substring(pos + 1)})
                                    return
                                }
                            }
                        }
                    }
                    resolve(null)
                }, reason => reject(reason))
            }
        })
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