interface ICurrency {

  /* Returns the currency balance, fraction is delimited with a period (.) */
  getBalance(): angular.IPromise<string>;

  /* Register a balance changed observer, unregister by calling the returned
     unregister method */
  subscribeBalanceChanged(handler: ()=>void): ()=>void;

  /* Manually invoke the balance changed observers */
  notifyBalanceChanged();

  /* Returns the native address */
  address: string;

  /* Returns the currency symbol */
  symbol: string;

  /* Invoke SEND currency dialog */
  invokeSendDialog($event);

  /* Invoke SEND token dialog */
  invokeSendToken($event);

  /* The full path of the home screen */
  homePath: string
}