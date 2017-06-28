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
}

interface ILocalKeyEntry {
  account: string;
  name: string;
  contents: string;
  isTestnet: boolean;
}

@Service('localKeyStore')
@Inject('storage','walletFile')
class LocalKeyStoreService {
  private store: Store;
  constructor(storage: StorageService, private walletFile: WalletFileService) {
    this.store = storage.namespace("keystore", null, true);
  }

  testnet() {
    return heat.isTestnet ? '.testnet' : '';
  }

  add(key: ILocalKey) {
    this.store.put(`key.${key.account}${this.testnet()}`, this.encode(key));
    this.store.put(`name.${key.account}${this.testnet()}`, key.name);
  }

  /* Adds a raw key entry, returns true iff entry did not exist, returns false iff already present */
  addRaw(key: ILocalKeyEntry): boolean {
    let key1 = `key.${key.account}${key.isTestnet?'.testnet':''}`;
    let key2 = `name.${key.account}${key.isTestnet?'.testnet':''}`;
    if (this.store.get(key1))
      return false;

    this.store.put(key1, key.contents);
    this.store.put(key2, key.name||'');
    return true;
  }

  /* lists all numeric account ids we have keys for */
  list(): Array<string> {
    var test = heat.isTestnet ? /key\.\d+\.testnet$/ : /key\.\d+$/;
    return this.store.keys().
                      filter((keyName) => test.test(keyName)).
                      map((keyName) => keyName.substring("key.".length).replace(/\.testnet$/,""));
  }

  /* lookup and return the account key name - if there is any */
  keyName(account: string) {
    return this.store.get(`name.${account}${this.testnet()}`);
  }

  remove(account: string) {
    this.store.remove(`key.${account}${this.testnet()}`);
    this.store.remove(`name.${account}${this.testnet()}`);
  }

  encode(key: ILocalKey): string {
    var payload = JSON.stringify({
      account: key.account,
      secretPhrase: key.secretPhrase,
      pincode: key.pincode,
      name: key.name
    });
    var message = heat.crypto.passphraseEncrypt(payload, key.pincode);
    return message.encode();
  }

  decode(encoded: string, passphrase: string): ILocalKey {
    var message = heat.crypto.PassphraseEncryptedMessage.decode(encoded);
    var json_str = heat.crypto.passphraseDecrypt(message, passphrase);
    var json = JSON.parse(json_str);
    return {
      account: json['account'],
      secretPhrase: json['secretPhrase'],
      pincode: json['pincode'],
      name: json['name']
    }
  }

  load(account: string, passphrase: string): ILocalKey {
    var contents = this.store.get(`key.${account}${this.testnet()}`);
    try {
      return this.decode(contents, passphrase);
    } catch (e) {
      console.log(e);
    }
  }

  private listLocalKeyEntries(): Array<ILocalKeyEntry> {
    let entries: Array<ILocalKeyEntry> = [];
    this.store.keys().forEach(keyName => {
      let match = keyName.match(/key\.(\d+)(\.testnet)?/);
      if (match) {
        let isTestnet = match[2]=='.testnet';
        let account = match[1];
        let name = this.store.get(`name.${account}${isTestnet?'.testnet':''}`);
        let contents = this.store.get(keyName);
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

  public export(): IHeatWalletFile {
    let wallet : IHeatWalletFile = {
      version: 1,
      entries: []
    };
    this.listLocalKeyEntries().forEach(entry => {
      wallet.entries.push({
        account: entry.account,
        contents: entry.contents,
        isTestnet: entry.isTestnet,
        name: entry.name
      })
    });
    return wallet;
  }

  /* Returns array of wallet entries added */
  public import(wallet: IHeatWalletFile) : Array<ILocalKeyEntry> {
    let added : Array<ILocalKeyEntry> = [];
    wallet.entries.forEach(entry => {
      let localKeyEntry: ILocalKeyEntry = {
        account: entry.account,
        contents: entry.contents,
        isTestnet: entry.isTestnet,
        name: entry.name
      };
      if (this.addRaw(localKeyEntry)) {
        added.push(localKeyEntry);
      }
    });
    return added;
  }
}