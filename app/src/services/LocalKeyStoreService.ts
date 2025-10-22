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
    this.store = storage.namespace("keystore", null, true)

    // try to convert data from local storage to IndexedDB
    setTimeout(() => {
      let k = 'heatwallet-db-converted-4.10.0'
      let storageConvertedIndicator = parseInt(localStorage.getItem(k))
      if (storageConvertedIndicator > 3) return

      db.walletEntryCount().then(num => {
        if (num > 0) return //new db already has data
        const regExp = heat.isTestnet ? /key\.\d+\.testnet$/ : /key\.\d+$/
        let accounts = this.store.keys()
            .filter((keyName) => regExp.test(keyName))
            .map((keyName) => keyName.substring("key.".length).replace(/\.testnet$/,""))
        if (accounts.length == 0) { //nothing to convert
          localStorage.setItem(k, '11')
          return
        }

        // increase counter to avoid data conversion confirmation question many times
        localStorage.setItem(k, String((storageConvertedIndicator || 0) + 1))

        dialogs.confirm(`Confirm`,
            `Detected wallet data in old format. Confirm conversion it to the actual format. Then app will be reloaded`).then(() => {
          let wltStore = storage.namespace('wallet', $rootScope, true)
          let accountCurrencies: Map<string, []> = new Map<string, []>()
          for (const account of accounts) {
            let selectedCurrencies = wltStore.get(account)
            if (selectedCurrencies) accountCurrencies.set(account, selectedCurrencies)
          }
          let exported = this.exportOld(accountCurrencies, {})
          let paymentMessages = wlt.exportPaymentMessages()
          exported = Object.assign(exported, {paymentMessages: paymentMessages})

          this.import(exported).then(addedKeys => {
            console.log(`Imported ${addedKeys.length} keys into this device.  The app will now restart...`)
            setTimeout(() => window.location.reload(), 1500)
            localStorage.setItem(k, '4')
          }).catch(reason => {
            console.error(reason)
            return `Error on processing file content: ${reason}`
          })
        })

      })

    }, 100)
  }

  /* Remembers a password for an account in the key store */
  rememberPassword(account: string, password: string) {
    this.rememberedPasswords[account] = password
  }

  /* Returns a remembered account password (if any) */
  getPasswordForAccount(account: string) {
    return this.rememberedPasswords[account]
  }

  put(key: ILocalKey) {
    this.rememberPassword(key.account, key.pincode)
    /*this.store.put(this.key(key.account), this.encode(key))
    this.store.put(this.nameKey(key.account), key.name)*/

    return db.saveWalletEntry(key.account, {name: key.name, contents: this.encode(key)})
  }

  /* lists all numeric account ids we have keys for */
  list(): Promise<any[]> {
    /*const test = heat.isTestnet ? /key\.\d+\.testnet$/ : /key\.\d+$/;
    return this.store.keys().
                      filter((keyName) => test.test(keyName)).
                      map((keyName) => keyName.substring("key.".length).replace(/\.testnet$/,""));*/
    return db.listWalletEntries()
  }

  /* lookup and return the account key name - if there is any */
  getName(account: string, isTestnet?: boolean) {
    return this.store.get(this.nameKey(account, isTestnet));
  }

  remove(account: string) {
    return db.removeWalletEntry(account)

    /*this.store.remove(this.key(account))
    this.store.remove(this.nameKey(account))*/
  }

  load(account: string, passphrase: string): Promise<ILocalKey> {
    return db.getWalletEntry(account).then(v => {
      let result = this.decode(v.contents, passphrase, account)
      if (result) this.rememberPassword(account, passphrase)
      return result
    })

    /*let contents = this.store.get(this.key(account))
    try {
      let result = this.decode(contents, passphrase, account);
      if (result) {
        this.rememberPassword(account, passphrase);
        return result;
      }
    } catch (e) {
      console.log(e);
    }*/
  }

  public exportOld(accountCurrencies: Map<string, []>,
                accountAddresses: {[account: string]: Array<string>}): IHeatWalletFile {
    let walletFileData : IHeatWalletFile = {
      version: 2,
      entries: [],
      accountAddresses: accountAddresses
    };

    this.listLocalKeyEntriesOld().forEach(entry => {
      let walletAddressStore = this.storage.namespace('wallet-address', this.$rootScope, true)
      let cryptoAddresses: {}
      wlt.CURRENCIES_LIST.forEach(c => {
        let encryptedAddresses = walletAddressStore.get(`${c.symbol}-${entry.account}`)
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
      let vl = wlt.getEntryVisibleLabelOld(entry.account)
      if (vl) item.visibleLabel = vl

      let subLabels = wlt.getEntryVisibleLabelListOld(entry.account)
      if (subLabels?.length > 0) item.visibleLabels = subLabels

      walletFileData.entries.push(item)
    })

    return walletFileData;
  }

  /* Returns array of wallet entries added */
  public import(walletFileData: IHeatWalletFile) : Promise<Array<ILocalKeyEntry>> {

    let added : Array<ILocalKeyEntry> = []

    /* Adds a raw key entry, returns true iff entry did not exist, returns false iff already present */
    const putRaw = (key: ILocalKeyEntry) => {
      /*let key1 = this.key(key.account)
      let key2 = this.nameKey(key.account)

      if (this.store.get(key1)) return false

      this.store.put(key1, key.contents)
      this.store.put(key2, key.name||'')*/

      return db.importWalletEntry(key.isTestnet, key.account, key.name || '', key.contents)
    }

    let promises: Promise<any>[] = []

    //let walletStore = this.storage.namespace('wallet-address', this.$rootScope, true)

    walletFileData.entries.forEach(importEntry => {
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
            //walletStore.put(`${c.symbol}-${importEntry.account}`, addresses)
            db.importAddresses(importEntry.isTestnet, importEntry.account, c.symbol, addresses)
          }
        })
      }

      promises.push(putRaw(localKeyEntry).then(id => {
        if (id) added.push(localKeyEntry)
      }))

      if (importEntry.visibleLabel) {
        wlt.updateEntryVisibleLabel(importEntry.visibleLabel, importEntry.account, '')
        //promises.push(storage.importWalletLabel(importEntry.isTestnet, importEntry.account, importEntry.account, importEntry.visibleLabel))
      }
      if (importEntry.visibleLabels?.length > 0) {
        /*const store = wlt.getStore()
        for (let ss of importEntry.visibleLabels) {
          store.put(ss[0], ss[1])
          //cannot store to IndexedDB storage because old import format does not provide currency symbol needed for id of label
          //storage.putItemLabel(itemKey, currencySym, account, visibleLabel || '')
        }*/



        //wlt.updateEntryVisibleLabelList(importEntry.account, importEntry.visibleLabels)

        /*for (let ss of importEntry.visibleLabels) {
          //  ["label.7245392807741217901.05dfa6a3f22afc28", "invoice #34"]
          let lastDotPos = ss[0].lastIndexOf('.')
          let itemKey = lastDotPos > 0 ? ss[0].substring(lastDotPos + 1) : null
          if (itemKey) {
            promises.push(storage.importWalletLabel(importEntry.isTestnet, importEntry.account, itemKey, ss[1]))
          }
        }*/
      }
      let walletEntryProps = {}  // accumulate wallet entry properties for saving to Indexeddb
      if (importEntry.currencies) {
        Object.assign(walletEntryProps, {selectedCurrencies: importEntry.currencies})
      }
      if (importEntry.bip44Compatible) {
        //wlt.saveEntryBip44Compatible(importEntry.account, importEntry.bip44Compatible)
        Object.assign(walletEntryProps, {bip44Compatible: importEntry.bip44Compatible})
      }
      promises.push(db.importWalletEntryProps(importEntry.isTestnet, importEntry.account, walletEntryProps))
    })

    // backward compatibility
    /*if (walletFile.accountAddresses) {
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
    }*/

    /*promises.push(
        this.importPaymentMessages(walletFile.paymentMessages)
            .then(messagesNum => console.log(`imported ${messagesNum} payment messages`))
    )*/

    if (walletFileData.paymentMessages) {
      walletFileData.paymentMessages.forEach(pm => {
        // todo import to both testnet and mainnet dbs because of old format (without testnet indicator)
        promises.push(db.importTransactionMemo(true, pm.id, pm.content))
        promises.push(db.importTransactionMemo(false, pm.id, pm.content))
      })
    }

    return Promise.all(promises).then(ids => added)
  }

  /*private importPaymentMessages(items: {id: string, content: any}[]) {
    if (!items) return Promise.resolve(0)
    // let store = getPaymentMessageStore()
    let promises: Promise<any>[] = []
    for (const item of items) {
      promises.push(db.putValue(item.id, item.content))
      //store.put(item.id, item.content)
    }
    return Promise.all(promises).then(() => items.length)
  }*/



  private testnet() {
    return heat.isTestnet ? '.testnet' : ''
  }

  private nameKey(account: string, isTestnet?: boolean) {
    return `name.${account}${isTestnet || this.testnet()}`
  }

  private key(account: string, isTestnet?: boolean) {
    return `key.${account}${isTestnet || this.testnet()}`
  }


  private encode(key: ILocalKey): string {
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

  private decode(encoded: string, passphrase: string, account?: string): ILocalKey {
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

  private listLocalKeyEntries(): Promise<Array<ILocalKeyEntry>> {

    return db.listWalletEntries().then(walletEntries => {
      let entries: Array<ILocalKeyEntry> = []
      for (const we of walletEntries) {
        entries.push({
          account: we.account,
          contents: we.contents,
          name: we.name,
          isTestnet: heat.isTestnet
        })
      }
      return entries
    })

    /*let entries: Array<ILocalKeyEntry> = []
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
    return entries;*/
  }

  /**
   * @deprecated
   */
  private listLocalKeyEntriesOld(): Array<ILocalKeyEntry> {

    let entries: Array<ILocalKeyEntry> = []
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
    return entries
  }

}
