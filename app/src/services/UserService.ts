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
@Inject('$q','address','$window','engine','localKeyStore','settings')
class UserService extends EventEmitter {

  public static EVENT_UNLOCKED = 'unlocked';
  public static EVENT_LOCKED = 'locked';

  public unlocked: boolean = false;

  /* Secret phrase as regular string */
  public secretPhrase: string;

  /* Public key as HEX string, obtained from secretphrase */
  public publicKey: string;

  /* Account identifier in RS format, for API usage purpose */
  public accountRS: string;

  /* Account color info */
  public accountColorId: string;
  public accountColorName: string;

  /* User email address */
  public email: string;

  /* User full name */
  public name: string;

  /* Account id used for display purposes, will hold the full `accountRS` address
     when used as FIMK or NXT wallet. Holds the RS address without the engine
     prefix for use in third party systems. */
  public identifier: string;

  /* Indicates if the user has verified his registration email. */
  public verified: boolean = false;

  constructor(private $q,
              private address: AddressService,
              private $window: angular.IWindowService,
              private engine: EngineService,
              private localKeyStore: LocalKeyStoreService,
              private settings: SettingsService) {
    super();
  }

  refresh() {
    return this.engine.socket().api.getAccount(this.accountRS).then(
      (account: IGetAccountResponse) => {
        this.email = account.accountEmail;
        this.accountColorId = account.accountColorId;
        this.accountColorName = account.accountColorName || 'EUR';
        this.verified = true;

        /* Store the sigin so it can be used from regular sigin the next time */
        if (!this.localKeyStore.find(this.email)) {
          this.localKeyStore.add({
            email: this.email,
            accountRS: this.accountRS,
            pincode: '12345',
            secretPhrase: this.secretPhrase
          })
        }
      },
      () => {
        this.verified = false;
      }
    )
  }

  /**
   * Login the current user, on success the promise returned is resolved
   * if for some reason the login fails the promise is rejected with a
   * reason.
   *
   * @param secretPhrase user secret phrase
   * @returns Promise
   */
  unlock(secretPhrase: string): angular.IPromise<any> {
    var deferred = this.$q.defer();

    /* Everything obtained from the secret phrase */
    this.secretPhrase = secretPhrase;
    this.publicKey = heat.crypto.secretPhraseToPublicKey(secretPhrase);
    this.accountRS = this.address.numericToRS(heat.crypto.getAccountId(secretPhrase));
    this.identifier = this.accountRS.replace(/^FIM-/,'');
    this.unlocked = true;

    /* The other parts are on the blockchain */
    this.refresh().then(
      () => {
        this.identifier = this.email || utils.normalizeRsAccount(this.accountRS);
        deferred.resolve();
        this.emit(UserService.EVENT_UNLOCKED);
      }
    );
    return deferred.promise;
  }

  lock() {
    this.secretPhrase = null;
    this.accountRS = null;
    this.identifier = null;
    this.email = null;
    this.name = null;
    this.accountColorId = null;
    this.accountColorName = null;
    this.unlocked = null;
    this.emit(UserService.EVENT_LOCKED);
    this.$window.location.reload();
  }
}