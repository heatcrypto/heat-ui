class HEATCurrency implements ICurrency {

  private heat: HeatService
  private sendmoney: SendmoneyService
  public symbol = 'HEAT'
  public homePath

  constructor(public secretPhrase: string, public address: string) {
    this.heat = heat.$inject.get('heat')
    this.sendmoney = heat.$inject.get('sendmoney')
    this.homePath = `/explorer-account/${this.address}/transactions`
  }

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string> {
    return this.heat.api.getAccountBalanceVirtual(this.address, "0", "0", 1).then(
      balance => {
        var formatted = utils.formatQNT(balance.virtualBalance, 8)
        return formatted
      }
    )
  }

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void {
    return this.heat.subscriber.balanceChanged({account: this.address}, handler);
  }

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged() {
    /* Ignore this since not needed for HEAT */
  }

  /* Invoke SEND currency dialog */
  invokeSendDialog($event) {
    this.sendmoney.dialog($event).show();
  }

  /* Invoke SEND token dialog */
  invokeSendToken($event) {
    return
  }
}