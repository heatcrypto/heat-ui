interface IBitcoinAPIList {

  getBalance(address: string)

  getTransactions(address: string, from: number, to: number): angular.IPromise<any>

  getAddressInfo(address: string): angular.IPromise<any>

  getEstimatedFee()

  getTxInfo(txId: string)

  getUnspentUtxos(form: string)

  broadcast(rawTx: string)
}