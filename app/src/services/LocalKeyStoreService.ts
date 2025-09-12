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

interface ILocalKey {
  account: string;
  pincode: string;
  secretPhrase: string;
  name: string;
  label?: string;
}

interface ILocalKeyEntry {
  account: string;
  name: string;  // account name, for example mega@heatwallet.com
  contents: string;
  isTestnet: boolean;
}

@Service('localKeyStore')
@Inject('storage','walletFile','$rootScope')
class LocalKeyStoreService {
  private store: Store;

  /* Remembered passwords to the localKeyStore */
  private rememberedPasswords: {[key:string]:string} = {}

  constructor(private storage: StorageService, private walletFile: WalletFileService, private $rootScope) {
    this.store = storage.namespace("keystore", null, true);
  }

  /* Remembers a password for an account in the key store */
  rememberPassword(account: string, password: string) {
    this.rememberedPasswords[account] = password
  }

  /* Returns a remembered account password (if any) */
  getPasswordForAccount(account: string) {
    return this.rememberedPasswords[account]
  }

  testnet() {
    return heat.isTestnet ? '.testnet' : '';
  }

  put(key: ILocalKey) {
    this.rememberPassword(key.account, key.pincode)
    this.store.put(this.key(key.account), this.encode(key))
    this.store.put(this.nameKey(key.account), key.name)
  }

  /* lists all numeric account ids we have keys for */
  list(): Array<string> {
    const test = heat.isTestnet ? /key\.\d+\.testnet$/ : /key\.\d+$/;
    return this.store.keys().
                      filter((keyName) => test.test(keyName)).
                      map((keyName) => keyName.substring("key.".length).replace(/\.testnet$/,""));
  }

  /* lookup and return the account key name - if there is any */
  getName(account: string, isTestnet?: boolean) {
    return this.store.get(this.nameKey(account, isTestnet));
  }

  nameKey(account: string, isTestnet?: boolean) {
    return `name.${account}${isTestnet || this.testnet()}`
  }

  key(account: string, isTestnet?: boolean) {
    return `key.${account}${isTestnet || this.testnet()}`
  }

  remove(account: string) {
    this.store.remove(this.key(account))
    this.store.remove(this.nameKey(account))
  }

  encode(key: ILocalKey): string {
    const payload = JSON.stringify({
      account: key.account,
      secretPhrase: key.secretPhrase,
      pincode: key.pincode,
      name: key.name,
      label: key.label
    });
    const message = heat.crypto.passphraseEncrypt(payload, key.pincode);
    return message.encode();
  }

  decode(encoded: string, passphrase: string, account?: string): ILocalKey {
    let message = heat.crypto.PassphraseEncryptedMessage.decode(encoded);
    let json_str = heat.crypto.passphraseDecrypt(message, passphrase);
    if (json_str) {
      let json = JSON.parse(json_str);
      //console.log(`decrypting is success for account ${account}`);
      return {
        account: json['account'],
        secretPhrase: json['secretPhrase'],
        pincode: json['pincode'],
        name: json['name'],
        label: json['label']
      }
    } else {
      //console.log(`decrypting is not success for account ${account}`);
    }
  }

  load(account: string, passphrase: string): ILocalKey {
    let contents = this.store.get(this.key(account))
    try {
      let result = this.decode(contents, passphrase, account);
      if (result) {
        this.rememberPassword(account, passphrase);
        return result;
      }
    } catch (e) {
      console.log(e);
    }
  }

  private listLocalKeyEntries(): Array<ILocalKeyEntry> {
    let entries: Array<ILocalKeyEntry> = [];
    this.store.keys().forEach(key => {
      let match = key.match(/key\.(\d+)(\.testnet)?/);
      if (match) {
        let isTestnet = match[2]=='.testnet';
        let account = match[1];
        let name = this.getName(account, isTestnet)
        let contents = this.store.get(key);
        entries.push({
          account:account,
          contents:contents,
          name:name,
          isTestnet:isTestnet
        });
      }
    });
    return entries;
  }

  public export(accountCurrencies: Map<string, []>,
                accountAddresses: {[account: string]: Array<string>}): IHeatWalletFile {
    let walletFileData : IHeatWalletFile = {
      version: 2,
      entries: [],
      accountAddresses: accountAddresses
    };

    let store = this.storage.namespace('wallet-address', this.$rootScope, true);

    this.listLocalKeyEntries().forEach(entry => {
      let cryptoAddresses: {}
      wlt.CURRENCIES_LIST.forEach(c => {
        let encryptedAddresses = store.get(`${c.symbol}-${entry.account}`)
        if (encryptedAddresses) {
          cryptoAddresses = cryptoAddresses || {}
          cryptoAddresses[c.symbol] = encryptedAddresses
        }
      })
      let item: IHeatWalletFileEntry = {
        account: entry.account,
        contents: entry.contents,
        isTestnet: entry.isTestnet,
        currencies: accountCurrencies.get(entry.account)
      }
      if (entry.name) item.name = entry.name
      if (wlt.getEntryBip44Compatible(entry.account)) item.bip44Compatible = true
      if (cryptoAddresses) item.cryptoAddresses = cryptoAddresses
      let vl = wlt.getEntryVisibleLabel(entry.account)
      if (vl) item.visibleLabel = vl

      let subLabels = wlt.getEntryVisibleLabelList(entry.account)
      if (subLabels?.length > 0) item.visibleLabels = subLabels

      walletFileData.entries.push(item)
    });

    return walletFileData;
  }

  /* Returns array of wallet entries added */
  public import(walletFile: IHeatWalletFile) : Promise<Array<ILocalKeyEntry>> {

    let added : Array<ILocalKeyEntry> = []

    /* Adds a raw key entry, returns true iff entry did not exist, returns false iff already present */
    const putRaw = (key: ILocalKeyEntry) => {
      let key1 = this.key(key.account)
      let key2 = this.nameKey(key.account)

      //if (this.store.get(key1)) return false

      this.store.put(key1, key.contents)
      this.store.put(key2, key.name||'')

      return storage.importWalletRecord(key.isTestnet, key.account, key.contents, key.name || '')
    }

    let promises: Promise<any>[] = []

    let walletStore = this.storage.namespace('wallet-address', this.$rootScope, true)

    walletFile.entries.forEach(importEntry => {
      let localKeyEntry: ILocalKeyEntry = {
        account: importEntry.account,
        contents: importEntry.contents,
        isTestnet: importEntry.isTestnet,
        name: importEntry.name
      }

      let cryptoAddresses = importEntry.cryptoAddresses || importEntry["oldAddresses"]  // use oldAddresses for compatibility to pre version
      if (cryptoAddresses) {
        wlt.CURRENCIES_LIST.forEach(c => {
          let addresses = cryptoAddresses[c.symbol]
          if (addresses) {
            walletStore.put(`${c.symbol}-${importEntry.account}`, addresses)
            storage.importAddresses(importEntry.isTestnet, importEntry.account, c.symbol, addresses)
          }
        })
      }

      promises.push(putRaw(localKeyEntry).then(id => {
        if (id) added.push(localKeyEntry)
      }))

      if (importEntry.visibleLabel) {
        wlt.updateEntryVisibleLabel(importEntry.visibleLabel, importEntry.account)
        promises.push(storage.importWalletLabel(importEntry.isTestnet, importEntry.account, importEntry.account, importEntry.visibleLabel))
      }
      if (importEntry.visibleLabels?.length > 0) {
        wlt.updateEntryVisibleLabelList(importEntry.account, importEntry.visibleLabels)

        for (let ss of importEntry.visibleLabels) {
          //  ["label.7245392807741217901.05dfa6a3f22afc28", "invoice #34"]
          let lastDotPos = ss[0].lastIndexOf('.')
          let itemKey = lastDotPos > 0 ? ss[0].substring(lastDotPos + 1) : null
          if (itemKey) {
            promises.push(storage.importWalletLabel(importEntry.isTestnet, importEntry.account, itemKey, ss[1]))
          }
        }
      }
      let walletEntryProps = {}  // accumulate wallet entry properties for saving to Indexeddb
      if (importEntry.currencies) {
        wlt.updateEntryCurrencies(importEntry.account, importEntry.currencies)
        Object.assign(walletEntryProps, {selectedCurrencies: importEntry.currencies})
      }
      if (importEntry.bip44Compatible) {
        wlt.saveEntryBip44Compatible(importEntry.account, importEntry.bip44Compatible)
        Object.assign(walletEntryProps, {bip44Compatible: importEntry.bip44Compatible})
      }
      promises.push(storage.updateWalletEntry(importEntry.isTestnet, importEntry.account, walletEntryProps))
    })

    // backward compatibility
    if (walletFile.accountAddresses) {
      try {
        let accountAddressesArray: any = walletFile.accountAddresses
        accountAddressesArray.forEach(item => {
          item[1].forEach(a => {
            // structure was changes several times so the code
            if (typeof a === "string") wlt.rememberAddressCreated(item[0], a)
            else if (typeof a[0] === "string") wlt.rememberAddressCreated(item[0], a[0])
          })
        })
      } catch (e) {
        console.error("Error on importing addresses: " + e.toString())
      }
    }

    let paymentMessagesNum = wlt.importPaymentMessages(walletFile.paymentMessages)
    if (walletFile.paymentMessages) {
      walletFile.paymentMessages.forEach(pm => {
        // todo import to both testnet and mainnet dbs because of old format (without testnet indicator)
        promises.push(storage.importTransactionMemo(true, pm.id, pm.content))
        promises.push(storage.importTransactionMemo(false, pm.id, pm.content))
      })
    }

    return Promise.all(promises).then(ids => added)
  }

}
