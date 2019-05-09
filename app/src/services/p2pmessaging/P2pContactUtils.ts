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

  updateContactCurrencyAddress(account: string, currency: string, address: string) {
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (!contact) return;
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
      this.searchContactByPublicName(query).then(contacts => deferred.resolve(contacts))
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
    return new Promise<IHeatMessageContact[]>((resolve, reject) => {
      let contacts: IHeatMessageContact[] = [];
      this.heat.api.searchPublicNames(query, 0, 100).then(accounts => {
        accounts.forEach(account => {
          if (this.p2pContactStore.get(account.id)) {
            contacts.push(this.p2pContactStore.get(account.id))
          }
        })
        resolve(contacts);
      })
    })
  }
}