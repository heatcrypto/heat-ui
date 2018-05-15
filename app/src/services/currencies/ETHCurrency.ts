class ETHCurrency implements ICurrency {

  private ethplorer: EthplorerService
  public symbol = 'ETH'
  public homePath

  constructor(public secretPhrase: string, public address: string) {
    this.ethplorer = heat.$inject.get('ethplorer')
    this.homePath = `/ethereum-account/${this.address}`
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.ethplorer.getBalance(this.address).then(
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
    dialogs.withdrawEther($event)
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }

}