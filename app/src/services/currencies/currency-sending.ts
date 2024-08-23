namespace wlt {

    export function sendingPostAction(txId: string, message: string) {
        let f = (resolve, reject) => {
            let user = <UserService> heat.$inject.get('user')
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
        }
        return new Promise((resolve, reject) => {
            if (message) {
                // to mask the message's time link to the time of original transaction
                setTimeout(f.bind(null, resolve, reject), 20_000 * Math.random())
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

}