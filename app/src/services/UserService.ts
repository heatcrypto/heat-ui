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
@Inject('$q','$window','localKeyStore','settings','$location','$rootScope')
class UserService extends EventEmitter {

  public static EVENT_UNLOCKED = 'unlocked';
  public static EVENT_LOCKED = 'locked';

  public unlocked: boolean = false;

  /* Secret phrase as regular string (the master seed - holds ethereum and heat) */
  public secretPhrase: string;

  /* Public key as HEX string, obtained from secretphrase (this is a HEAT public key!!)*/
  public publicKey: string;

  /* HEAT Account in numeric format */
  public account: string;

  /* HEAT Public or private email identifier */
  public accountName: string;
  public accountNameIsPrivate: boolean;

  /* Local key storage key */
  public key: ILocalKey;

  /* Compatible with Ethereum and Bitcoin */
  public bip44Compatible: boolean;

  /* ICurrency implementation in use currently, the currency used is determined when we
     unlock an account (provide secret phrase + selected address + currency type) */
  public currency: ICurrency = null

  constructor(private $q,
              private $window: angular.IWindowService,
              private localKeyStore: LocalKeyStoreService,
              private settings: SettingsService,
              private $location: angular.ILocationService,
              private $rootScope: angular.IRootScopeService) {
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
            return;
          }
        }
      }
    }).finally(deferred.resolve);
    return deferred.promise;
  }

  /**
   * Login the current user, on success the promise returned is resolved
   * if for some reason the login fails the promise is rejected with a
   * reason.
   *
   * @param secretPhrase user secret phrase
   * @param key ILocalKey
   * @returns Promise
   */
  unlock(secretPhrase: string, key?: ILocalKey, bip44Compatible?: boolean, currency?: ICurrency): angular.IPromise<any> {
    var deferred = this.$q.defer();

    /* wrap this in evalasync so that any component based on ng-if="vn.user.unlocked"
       will be reloaded */
    // this.lock(true) // should be removed with the depricated eth stuff from UserService?
    this.$rootScope.$evalAsync(()=> {
      /* Now all ng-if="vn.user.unlocked" are destroyed */
      this.$rootScope.$evalAsync(()=> {
        if(key)
          this.key = key;

        /* We either receive a fully setup ICurrency from the caller or we need to create
          one ourselves. The situation in which we create one is all the cases apart from those
          where we explicitly want some other currency and address than standard HEAT */
        if (!currency) {
          let address = heat.crypto.getAccountId(secretPhrase);
          currency = new HEATCurrency(secretPhrase, address)
        }

        /* Store the currency */
        this.currency = currency

        /* Circular dependencies force this */
        this.bip44Compatible = bip44Compatible || false

        /* Everything obtained from the secret phrase - These are all for the master HEAT account */
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
      })
    })

    return deferred.promise;
  }

  lock(noreload?:boolean) {
    this.key = null
    this.secretPhrase = null;
    this.unlocked = false;
    this.account = null;
    this.currency = null
    this.bip44Compatible = false
    this.emit(UserService.EVENT_LOCKED);
    if (noreload)
      return
    window.location.reload(true);
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

      // update local wallet name
      if (this.key && this.key.name != this.accountName) {
        this.key.name = this.accountName;
        this.localKeyStore.add(this.key);
      }
      return true;
    }
    return false;
  }
}