class ETHCurrency implements ICurrency {

  private etherscanService: EtherscanService
  public symbol = 'ETH'
  public homePath

  constructor(public secretPhrase: string, public address: string) {
    this.etherscanService = heat.$inject.get('etherscanService')
    this.homePath = `/ethereum-account/${this.address}`
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.etherscanService.getBalance(this.address).then(
      balance => {
        return balance+""
      }
    )
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void {
    return function () {}
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {

  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {

  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

}