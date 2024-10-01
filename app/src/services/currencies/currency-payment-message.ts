namespace wlt {

    export type SendingResult = { txId: string, paymentMessageMethod: number, heatUnavailableReason: string, message?: string }
    let messageStore: Store
    let heatService: HeatService
    let userService: UserService
    const PAYMENT_MESSAGE_BIRTH_TIME = new Date(2024, 7, 20).getTime()
    const SERVICE_PUBKEY = "9b3cc534be3cf8b9c0d75ac9e32c1b96b45679de7515ca367ac5637c4f32305a" //HEAT account 349054386597789736

    export function paymentMemoDialog(txId: string, heatUnavailableReason: string) {
        let locals = {
            v: {
                text: "",
                paymentMessageMethod: undefined,
                heatUnavailableReason: heatUnavailableReason,
                sharedMemo: false
            }
        }
        return dialogs.dialog({
            id: 'paymentMemo',
            title: "Payment Memo",
            okButton: true,
            cancelButton: true,
            locals: locals,
            template: `
              <md-input-container flex style="margin-bottom: 16px;">
                  <div>Store message on:</div>
                  <md-radio-group ng-model="vm.v.paymentMessageMethod" layout="row">
                    <md-radio-button value=0 >This device</md-radio-button>
                    <md-radio-button value=1 ng-disabled="vm.v.heatUnavailableReason">Heat blockchain</md-radio-button>
                    <span ng-if="vm.v.heatUnavailableReason" style="color: grey"> &nbsp;&nbsp;({{vm.v.heatUnavailableReason}})</span>
                  </md-radio-group>
                  <md-checkbox ng-model="vm.v.sharedMemo" ng-if="vm.v.paymentMessageMethod == 1" style="margin-top: 4px;">
                    Share memo to recipient
                  </md-checkbox>
              </md-input-container>
              <md-input-container flex>
                  <label>Payment message / memo (encrypted)</label>
                  <input required ng-model="vm.v.text" name="message" ng-maxlength="500" ng-disabled="!vm.v.paymentMessageMethod">
              </md-input-container>
            `
        }).then(value => {
            let recipientPubKey = locals.v.paymentMessageMethod == 1 && locals.v.sharedMemo ? null : getUserService().publicKey
            return storePaymentMessage(txId, locals.v.text, locals.v.paymentMessageMethod, recipientPubKey)
        })
    }

    export function storePaymentMessage(txId: string, message: string, paymentMessageMethod: number, recipientPubKey?: string) {
        let user = getUserService()
        let resolvedRecipientPubKey = recipientPubKey || SERVICE_PUBKEY
        let encryptedMessage = heat.crypto.encryptMessage(
            message,
            resolvedRecipientPubKey,
            user.secretPhrase)
        let messageId = createMessageId(txId, resolvedRecipientPubKey)

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
                    sendHeatPaymentMessage(resolve, reject)
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
                        return "Unknown HEAT balance: " + e?.toString()
                    }
                })
            .catch(reason => {
                console.error(reason)
                return "Cannot recognise the state of HEAT account: " + reason?.toString()
            })
    }

    let apiGetKeystoreValueFunc

    export function loadPaymentMessage(txId: string, messageTime: number) {
        let store = getPaymentMessageStore()
        let user = getUserService()
        //message id is seen for everybody so use hash to hide real tx id
        let selfMessageId = createMessageId(txId, user.publicKey)
        let messageId = createMessageId(txId, SERVICE_PUBKEY)

        let decrypt = (encrypted: IEncryptedMessage) => {
            try {
                return heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, user.publicKey, user.secretPhrase)
            } catch (e) {}
            try {
                return heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, SERVICE_PUBKEY, user.secretPhrase)
            } catch (e) {}
            return null
        }

        return new Promise<{ method: number, text: string }>((resolve, reject) => {
            //first try to load message from local store
            let encryptedMessage: IEncryptedMessage = store.get(selfMessageId)
            let messageText = encryptedMessage ? decrypt(encryptedMessage) : null
            if (messageText) {
                resolve({method: 0, text: messageText})
                return
            }
            if (!apiGetKeystoreValueFunc) {
                apiGetKeystoreValueFunc = (account, messageIds) => getHeatService().api.getKeystoreAccountEntries(account, messageIds)
            }
            //there is no message in local store so try find the entry in HEAT Keystore using 2 ids
            apiGetKeystoreValueFunc(user.account, `${selfMessageId},${messageId}`).then(response => {
                let parsed = utils.parseResponse(response)
                if (!parsed.errorDescription && parsed.entries) {
                    let entry = parsed.entries[0]
                    encryptedMessage = JSON.parse(entry.value)
                    let message = decrypt(encryptedMessage)
                    resolve(message ? {method: 1, text: message} : null)
                }
            }, reason => {
                if (reason.code == -1) {
                    //use old API function that return error response on not found value
                    apiGetKeystoreValueFunc = (account, messageId) => getHeatService().api.getKeystoreAccountEntry(account, messageId)
                }
                if (reason.description == "Unknown key") {
                    resolve(null)
                } else {
                    reject(reason)
                }
            })
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

    function createMessageId(txId: string, recipientPubKey: string) {
        let userPrivateKeyBytes = converters.hexStringToByteArray(
            heat.crypto.getPrivateKey(getUserService().secretPhrase))
        const recipientPubKeyBytes = converters.hexStringToByteArray(recipientPubKey)
        let sharedSecret = heat.crypto.getSharedKey(userPrivateKeyBytes, recipientPubKeyBytes)
        return heat.crypto.calculateStringHash(txId + sharedSecret)
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