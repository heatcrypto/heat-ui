/// <reference path='../lib/EventEmitter.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
@Service('user')
@Inject('$q','$window','localKeyStore','settings','$location')
class UserService extends EventEmitter {

  public static EVENT_UNLOCKED = 'unlocked';
  public static EVENT_LOCKED = 'locked';

  public unlocked: boolean = false;

  /* Secret phrase as regular string */
  public secretPhrase: string;

  /* Public key as HEX string, obtained from secretphrase */
  public publicKey: string;

  /* Account in numeric format */
  public account: string;

  /* Public or private email identifier */
  public accountName: string;
  public accountNameIsPrivate: boolean;

  /* New accounts don't yet exist on the blockchain */
  public newAccount: boolean;

  public accountColorName: string = "HEAT";
  public accountColorId: string = "0";

  constructor(private $q,
              private $window: angular.IWindowService,
              private localKeyStore: LocalKeyStoreService,
              private settings: SettingsService,
              private $location: angular.ILocationService) {
    super();
  }

  refresh() {
    var deferred = this.$q.defer();
    let assigner = this.settings.get(SettingsService.HEATLEDGER_NAME_ASSIGNER);
    let heatService = <HeatService> heat.$inject.get('heat');
    heatService.api.getTransactionsFromTo(assigner, this.account, 0, 10).then((transactions) => {
      for (let i=0; i<transactions.length; i++) {
        let rawText = heatService.getHeatMessageContents(transactions[i]);
        if (rawText) {
          if (this.tryParseRegistrationMessage(rawText)) {
            deferred.resolve();
            return;
          }
        }
      }
      deferred.resolve();
    }, deferred.rejected);
    return deferred.promise;
  }

  /**
   * Login the current user, on success the promise returned is resolved
   * if for some reason the login fails the promise is rejected with a
   * reason.
   *
   * @param secretPhrase user secret phrase
   * @param newAccount boolean
   * @returns Promise
   */
  unlock(secretPhrase: string, newAccount: boolean): angular.IPromise<any> {
    var deferred = this.$q.defer();
    this.newAccount = newAccount;

    /* Everything obtained from the secret phrase */
    this.secretPhrase = secretPhrase;
    this.publicKey = heat.crypto.secretPhraseToPublicKey(secretPhrase);
    this.account = heat.crypto.getAccountId(secretPhrase);
    this.unlocked = true;
    this.accountName = '[no name]';

    /* The other parts are on the blockchain */
    this.refresh().then(() => {
      deferred.resolve();
      this.emit(UserService.EVENT_UNLOCKED);
    });
    return deferred.promise;
  }

  lock() {
    this.secretPhrase = null;
    this.unlocked = null;
    this.account = null;
    this.emit(UserService.EVENT_LOCKED);
    this.$location.path('login');
  }

  requireLogin() {
    if (!this.unlocked) {
      this.$location.path('login');
    }
  }

  tryParseRegistrationMessage(rawText: string): boolean {
    let regexp = /You have chosen the (public|private) user name `(.*)`/m;
    let match = rawText.match(regexp);
    if (match) {
      this.accountNameIsPrivate = match[1] == 'private';
      this.accountName = match[2];
      return true;
    }
    return false;
  }
}