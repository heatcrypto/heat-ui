@Service('p2pContactUtils')
@Inject('storage', 'heat', '$q', 'user')
class P2pContactUtils {
  private static numbersOnly = /^[0-9]+$/;
  private p2pContactStore: Store;

  constructor(
    private storage: StorageService,
    private heat: HeatService,
    private $q: angular.IQService,
    private user: UserService) {
    this.p2pContactStore = storage.namespace('p2pContacts')
  }

  saveContact(account: string, publicKey: string, publicName: string, calledTimestamp?: number) {
    if (!publicKey) return;
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (contact && calledTimestamp && calledTimestamp != contact.activityTimestamp) {
      contact.activityTimestamp = calledTimestamp;
      this.p2pContactStore.put(account, contact);
    }
    if (!contact) {
      contact = {
        account: account,
        privateName: '',
        publicKey: publicKey,
        publicName: publicName,
        timestamp: 0,
        activityTimestamp: calledTimestamp
      };
      this.p2pContactStore.put(account, contact);
    }
  }

  updateContactCurrencyAddress(account: string, currency: string, address: string, publicKey: string, publicName: string, calledTimeStamp?: number) {
    if (!publicKey) return;
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (!contact) this.saveContact(account, publicKey, publicName, calledTimeStamp);
    let currencyAddressMap: currencyAddressMap = {
      name: currency,
      address
    }
    if (!contact.cryptoAddresses) {
      contact.cryptoAddresses = [currencyAddressMap];
    } else if (contact.cryptoAddresses.findIndex(map => map.name === currency) === -1) {
      contact.cryptoAddresses.push(currencyAddressMap);
    } else {
      contact.cryptoAddresses[contact.cryptoAddresses.findIndex(map => map.name === currency)] = currencyAddressMap;
    }
    this.p2pContactStore.put(account, contact);
  }

  lookupContact(query: string) {
    let deferred = this.$q.defer<IHeatMessageContact[]>()
    let isNumbersOnly = P2pContactUtils.numbersOnly.test(query)
    if (isNumbersOnly) {
      deferred.resolve(this.searchContactByNumericId(query));
    } else {
      deferred.resolve(this.searchContactByPublicName(query));
    }
    return deferred.promise;
  }

  searchContactByNumericId(query: string) {
    let contacts: IHeatMessageContact[] = [];
    let keys = this.p2pContactStore.keys().filter(key => key.startsWith(query))
    keys.forEach(key => contacts.push(this.p2pContactStore.get(key)))
    return contacts;
  }

  searchContactByPublicName(query: string) {
    let contacts: IHeatMessageContact[] = [];
    let keys = this.p2pContactStore.keys()
    keys.forEach(key => {
      let contact = this.p2pContactStore.get(key)
      if (contact.publicName.indexOf(query) > -1) {
        contacts.push(contact)
      }
    })
    return contacts;
  }

  shareCryptoAddress(contact: IHeatMessageContact, currency: string, value: string) {
    let validatedCurrency = currency.toLocaleLowerCase();
    this.heat.api.getKeystoreAccountEntry(this.user.key.account, `${contact.account}-${validatedCurrency}`).then(response => {
      let parsed = utils.parseResponse(response);
      if (parsed.errorDescription === 'Unknown key') {
        let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.key.secretPhrase)
        this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.key.secretPhrase)
      } else {
        let split = parsed.value.split("-");
        let decrypted = heat.crypto.decryptMessage(split[0], split[1], contact.publicKey, this.user.key.secretPhrase)
        if(decrypted == value) {
          return
        } else {
          let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.key.secretPhrase)
          this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.key.secretPhrase)
        }
      }
    }).catch(e => {
      let parsed = utils.parseResponse(e);
      if (parsed.description === 'Unknown key') {
        let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.key.secretPhrase)
        this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.key.secretPhrase)
      }
    })
  }

  fetchCryptoAddress(contact: IHeatMessageContact, currency: string) {
    let validatedCurrency = currency.toLocaleLowerCase();
    this.heat.api.getKeystoreAccountEntry(contact.account, `${this.user.key.account}-${validatedCurrency}`).then(response => {
      let parsed = utils.parseResponse(response);
      let split = parsed.value.split("-");
      let decrypted = heat.crypto.decryptMessage(split[0], split[1], contact.publicKey, this.user.key.secretPhrase)
      console.log('decrypted value: ' + decrypted)
      this.updateContactCurrencyAddress(contact.account, currency, decrypted, contact.publicKey, contact.publicName)
    }).catch(e => {
      console.log(`Error getting keystore value of contact ${contact.account}-${validatedCurrency}`, e)
    })
  }
}