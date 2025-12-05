interface IBitcoinAPIList {

  getBalance(address: string)

  getTransactions(address: string, from: number, to: number): angular.IPromise<any>

  getAddressInfo(address: string, onlyBalance?): angular.IPromise<any>

  getEstimatedFee(feeBlocks: number): angular.IPromise<any>

  getTxInfo(txId: string)

  getUnspentUtxos(from: string)

  getUtxos(addresses: [string]): Promise<any[]>

  broadcast(rawTx: string)
}