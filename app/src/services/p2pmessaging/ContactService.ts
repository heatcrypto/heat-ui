@Service('contactService')
@Inject('storage', 'heat', '$q', 'user')
class ContactService {
  private static numbersOnly = /^[0-9]+$/;
  private p2pContactStore: Store;
  private latestTimestampStore: Store;

  constructor(
    private storage: StorageService,
    private heat: HeatService,
    private $q: angular.IQService,
    private user: UserService)
  {
    this.p2pContactStore = storage.namespace('p2pContacts')
    this.latestTimestampStore = storage.namespace('contacts.latestTimestamp')
  }

  /**
   * Reurn merged offchain contacts with onchain contacts
   * @param selectedContactPublicKey
   */
  getContacts(selectedContactPublicKey?) {
    let localContacts: IHeatMessageContact[] = []
    this.p2pContactStore.forEach((key, p2pContact: IHeatMessageContact) => localContacts.push(p2pContact))
    return this.heat.api.getMessagingContacts(this.user.account, 0, 100).then((contacts) => {
      //merge contacts obtained via p2p messaging
      localContacts.forEach(p2pContact => {
        let existingHeatContact = contacts.find(contact => !p2pContact.publicKey || contact.publicKey == p2pContact.publicKey)
        if (existingHeatContact) {
          existingHeatContact.activityTimestamp = p2pContact.activityTimestamp
        } else {
          p2pContact.isP2POnlyContact = true
          contacts.push(p2pContact)
        }
      })

      contacts = contacts
        .filter(contact => contact.publicKey && contact.account != this.user.account)
        .map((contact) => {
          if (selectedContactPublicKey != contact.publicKey) {
            contact['hasUnreadMessage'] = !contact.isP2POnlyContact && this.contactHasUnreadMessage(contact);
            contact['hasUnreadP2PMessage'] = this.contactHasUnreadP2PMessage(contact);
          }
          // contact['p2pStatus'] = this.p2pStatus(contact);
          return contact;
        })
        .sort(
          (c1, c2) =>
            (c2.activityTimestamp ? Math.abs(c2.activityTimestamp) : 0) - (c1.activityTimestamp ? Math.abs(c1.activityTimestamp) : 0));

      return contacts
    }).catch(reason => {
      console.error("Error on getting messaging contacts from server: " + (reason.description || reason.data?.errorDescription))
      return localContacts
    })
  }

  /**
   *
   * @param account
   * @param publicKey
   * @param publicName
   * @param calledTimestamp set negative time to force selecting the contact in contact list
   */
  saveContact(account: string, publicKey: string, publicName?: string, calledTimestamp?: number, newIncomingContact?: boolean) {
    if (!publicKey) return;
    let save = (publicName?: string) => {
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
          activityTimestamp: calledTimestamp,
          newIncomingContact: newIncomingContact
        };
        this.p2pContactStore.put(account, contact);
      }
    }
    try {
      if (publicName) {
        save(publicName)
      } else {
        this.heat.api.searchPublicNames(account, 0, 100).then(accounts => {
          let expectedAccount = accounts.find(v => v.publicKey == publicKey)
          save(expectedAccount ? expectedAccount.publicName : null)
        });
      }
      return true
    } catch (e) {
      console.log("Save contact error " + e);
      if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(e.name) >= 0) {
        //shrink history of all accounts when reach storage limit
        let p2pMessaging: P2PMessaging = heat.$inject.get('P2PMessaging')
        let room = p2pMessaging.getOneToOneRoom(publicKey, true);
        if (room) {
          if (room.getMessageHistory().shrink(5, () => save(publicName))) return true
        }
      }
    }
    return false
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
    let isNumbersOnly = ContactService.numbersOnly.test(query)
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
    this.heat.api.getKeystoreAccountEntry(this.user.account, `${contact.account}-${validatedCurrency}`).then(response => {
      let parsed = utils.parseResponse(response);
      if (parsed.errorDescription === 'Unknown key') {
        let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.secretPhrase)
        this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.secretPhrase)
      } else {
        let split = parsed.value.split("-");
        let decrypted = heat.crypto.decryptMessage(split[0], split[1], contact.publicKey, this.user.secretPhrase)
        if(decrypted == value) {
          return
        } else {
          let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.secretPhrase)
          this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.secretPhrase)
        }
      }
    }).catch(e => {
      let parsed = utils.parseResponse(e);
      if (parsed.description === 'Unknown key') {
        let encrypted = heat.crypto.encryptMessage(value, contact.publicKey, this.user.secretPhrase)
        this.heat.api.saveKeystoreEntry(`${contact.account}-${validatedCurrency}`, `${encrypted.data}-${encrypted.nonce}`, this.user.secretPhrase)
      }
    })
  }

  fetchCryptoAddress(contact: IHeatMessageContact, currency: string) {
    let validatedCurrency = currency.toLocaleLowerCase();
    this.heat.api.getKeystoreAccountEntry(contact.account, `${this.user.account}-${validatedCurrency}`).then(response => {
      let parsed = utils.parseResponse(response);
      let split = parsed.value.split("-");
      let decrypted = heat.crypto.decryptMessage(split[0], split[1], contact.publicKey, this.user.secretPhrase)
      console.log('decrypted value: ' + decrypted)
      this.updateContactCurrencyAddress(contact.account, currency, decrypted, contact.publicKey, contact.publicName)
    }).catch(e => {
      console.log(`Error getting keystore value of contact ${contact.account}-${validatedCurrency}`, e)
    })
  }

  contactHasUnreadMessage(contact: IHeatMessageContact): boolean {
    console.log(contact.account + " " +contact.publicName + " " + contact.timestamp + " " + this.latestTimestampStore.getNumber(contact.account, 0))
    return contact.timestamp > this.latestTimestampStore.getNumber(contact.account, 0);
  }

  contactHasUnreadP2PMessage(contact: IHeatMessageContact): boolean {
    let p2pMessaging: P2PMessaging = heat.$inject.get('P2PMessaging')
    let room = p2pMessaging.getOneToOneRoom(contact.publicKey, true);
    if (room) {
      return p2pMessaging.roomHasUnreadMessage(room);
    }
    return false;
  }

}
