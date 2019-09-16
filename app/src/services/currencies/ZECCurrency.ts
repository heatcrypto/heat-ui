class ZECCurrency implements ICurrency {

  private zecBlockExplorerService: ZecBlockExplorerService
  public symbol = 'ZEC'
  public homePath
  private user: UserService

  constructor(public masterSecretPhrase: string, public secretPhrase: string, public address: string) {
    this.zecBlockExplorerService = heat.$inject.get('zecBlockExplorerService')
    this.homePath = `/zcash-account/${this.address}`
    this.user = heat.$inject.get('user')
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.zecBlockExplorerService.getBalance(this.address).then(
      balance => {
        return utils.commaFormat(balance.toFixed(8))
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
  invokeSendDialog = ($event) => {

  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {

  }
}
