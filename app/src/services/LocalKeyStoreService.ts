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

@Service('localKeyStore')
@Inject('storage')
class LocalKeyStoreService {
  private store: Store;
  constructor(storage: StorageService) {
    this.store = storage.namespace("keystore", null, true);
    //updateLegacyLocalKeyStoreData(this.store); // Need to do this to stay compatible with 0.1.0 release format.
  }

  testnet() {
    return heat.isTestnet ? '.testnet' : '';
  }

  add(key: ILocalKey) {
    this.store.put(`key.${key.account}${this.testnet()}`, this.encode(key));
    this.store.put(`name.${key.account}${this.testnet()}`, key.name);
  }

  /* lists all numeric account ids we have keys for */
  list(): Array<string> {
    var test = heat.isTestnet ? /key\.\d+\.testnet/ : /key\.\d+/;
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
}

/* Find all entries that start with 'LOCAL_KEY_STORE_ENTRY:', move them
 * into the namespaced @store parameter. Replace each key which has the
 * form LOCAL_KEY_STORE_ENTRY:[account id]. With the new form which
 * is 'key.[account id]'. */
// function updateLegacyLocalKeyStoreData(store: Store) {

//   // collect all legacy keys
//   var keys = [];
//   for (var i=0; i<localStorage.length; i++) {
//     var key = localStorage.key(i);
//     if (key.indexOf('LOCAL_KEY_STORE_ENTRY:') == 0) {
//       keys.push(key);
//     }
//   }

//   // move all keys and their values into the new namespace
//   keys.forEach((keyName) => {
//     var newKey = keyName.replace('LOCAL_KEY_STORE_ENTRY:','key.');
//     var value = localStorage.getItem(keyName);
//     store.put(newKey, value);
//   });

//   // remove all deprecated keys [DONT DO THIS FOR NOW ... ]
//   // keys.forEach((keyName) => { localStorage.removeItem(keyName) });
// }