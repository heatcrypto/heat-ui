namespace wlt {

    export type SendingResult = { txId: string, paymentMessageMethod: number, heatUnavailableReason: string, message?: string }
    let messageStore: Store
    let heatService: HeatService
    let userService: UserService

    export function paymentMemoDialog(txId: string, heatUnavailableReason: string) {
        let locals = {
            txId: txId,
            v: {
                text: "",
                paymentMessageMethod: undefined,
                heatUnavailableReason: heatUnavailableReason
            }
        }
        return dialogs.dialog({
            id: 'paymentMemo',
            title: "Payment Memo",
            okButton: true,
            cancelButton: true,
            locals: locals,
            template: `
              <p flex>
                  <label>Transaction</label>
                  <span>&nbsp;&nbsp;{{vm.txId}}</span>
              </p>
              <md-input-container flex style="margin-bottom: 16px;">
                  <p>Store message on:</p>
                  <md-radio-group ng-model="vm.v.paymentMessageMethod" layout="row">
                    <md-radio-button value=0 >This device</md-radio-button>
                    <md-radio-button value=1 ng-disabled="vm.v.heatUnavailableReason">Heat blockchain</md-radio-button>
                    <span ng-if="vm.v.heatUnavailableReason" style="color: grey"> &nbsp;&nbsp;({{vm.v.heatUnavailableReason}})</span>
                  </md-radio-group>
              </md-input-container>
              <md-input-container flex>
                  <label>Payment message / memo (encrypted)</label>
                  <input required ng-model="vm.v.text" name="message" ng-maxlength="500" ng-disabled="!vm.v.paymentMessageMethod">
              </md-input-container>
            `
        }).then(value => {
            return storePaymentMessage(txId, locals.v.text, locals.v.paymentMessageMethod)
        })
    }

    export function storePaymentMessage(txId: string, message: string, paymentMessageMethod: number, recipientPubKey?: string) {
        let user = getUserService()
        recipientPubKey = recipientPubKey || user.publicKey
        let encryptedMessage = heat.crypto.encryptMessage(
            message,
            recipientPubKey,
            user.secretPhrase)
        let messageId = createMessageId(txId, recipientPubKey)

        let sendHeatPaymentMessage = (resolve, reject, resultMessage: {method: number, text: string}) => {
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
                        resolve(resultMessage)
                    } else {
                        errorCallback.bind(null, value.internalError || value.serverError)
                    }
                }, errorCallback)
                .catch(errorCallback)
        }

        return new Promise<{method: number, text: string}>((resolve, reject) => {
            if (message) {
                let result = {method: paymentMessageMethod, text: message}
                if (paymentMessageMethod == 0) {
                    //store payment message to local storage
                    db.putTransactionMemo(messageId, encryptedMessage).then(() => resolve(result))
                } else if (paymentMessageMethod == 1) {
                    sendHeatPaymentMessage(resolve, reject, result)
                } else {
                    resolve(undefined)
                }
            } else {
                resolve(undefined)
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
                return "Cannot recognise the state of HEAT account: " + reason?.description || JSON.stringify(reason)
            })
    }

    let apiGetKeystoreValueFunc

    export function loadPaymentMessage(txId: string, accountSecretPhrase?: string, localOnly = false) {
        let user = getUserService()
        let pair = accountSecretPhrase
            ? {pubKey: heat.crypto.secretPhraseToPublicKey(accountSecretPhrase), secret: accountSecretPhrase}
            : {pubKey: user.publicKey, secret: user.secretPhrase}

        //todo не работает сканирование payment messages из WalletEntry
        //pair = {pubKey: user.publicKey, secret: user.secretPhrase}  // DEBUG

        //hide original txId in message id
        let messageId = createMessageId(txId, pair.pubKey)

        let decrypt = (encrypted: heat.crypto.IEncryptedMessage) => {
            try {
                return heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, pair.pubKey, pair.secret)
            } catch (e) {}
            return null
        }

        // let encryptedMessage: heat.crypto.IEncryptedMessage = store.get(messageId)
        return db.getTransactionMemo(messageId).then(record => {
            let encryptedMessage: heat.crypto.IEncryptedMessage = record?.content
            let messageText = encryptedMessage ? decrypt(encryptedMessage) : null
            let localResult = messageText ? {method: 0, text: messageText} : null
            if (localOnly) {
                return localResult
            }

            return new Promise<{method: number, text: string}>((resolve, reject) => {
                if (localResult) {
                    resolve(localResult)
                    return
                }

                if (!apiGetKeystoreValueFunc) {
                    apiGetKeystoreValueFunc = (account, messageIds) => getHeatService().api.getKeystoreAccountEntryExt(account, messageIds)
                }

                //there is no message in local store so try find the entry in HEAT Keystore using 2 ids
                apiGetKeystoreValueFunc(user.account, messageId).then(response => {
                    let parsed = utils.parseResponse(response)
                    if (parsed.errorDescription) {
                        reject(parsed.errorDescription)
                    } else {
                        //new api keystore function returns multiple entries, old api func returns entry directly
                        let entry = parsed.entries ? parsed.entries[0] : parsed
                        let message
                        if (entry) {
                            encryptedMessage = JSON.parse(entry.value)
                            message = decrypt(encryptedMessage)
                        }
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
        })
    }

    export function exportPaymentMessages() {
        let store = getPaymentMessageStore()
        return store.keys().map(k => ({id: k, content: store.get(k)}))
    }

    function createMessageId(txId: string, recipientPubKey: string) {
        let userPrivateKeyBytes = converters.hexStringToByteArray(
            heat.crypto.getPrivateKey(getUserService().secretPhrase))
        const recipientPubKeyBytes = converters.hexStringToByteArray(recipientPubKey)
        let sharedSecret = heat.crypto.getSharedKey(userPrivateKeyBytes, recipientPubKeyBytes)
        return heat.crypto.calculateStringHash(txId + sharedSecret)
    }

    //needed for export in old format
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