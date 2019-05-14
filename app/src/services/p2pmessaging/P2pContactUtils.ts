@Service('p2pContactUtils')
@Inject('storage', 'heat', '$q')
class P2pContactUtils {
  private static numbersOnly = /^[0-9]+$/;
  private p2pContactStore: Store;

  constructor(
    private storage: StorageService,
    private heat: HeatService,
    private $q: angular.IQService) {
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

  updateContactCurrencyAddress(account: string, currency: string, address: string, publicKey: string, publicName: string, calledTimeStamp?:number) {
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
      if(contact.publicName.indexOf(query) > -1){
        contacts.push(contact)
      }
    })
    return contacts;
  }
}