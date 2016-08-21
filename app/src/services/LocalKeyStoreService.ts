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
}

var LOCAL_KEY_STORE_ENTRY = 'LOCAL_KEY_STORE_ENTRY';
function isKeyStoreKey(key: string) {
  return key.indexOf(LOCAL_KEY_STORE_ENTRY) == 0;
}

@Service('localKeyStore')
class LocalKeyStoreService {

  storage: Storage = window.localStorage;

  add(key: ILocalKey) {
    this.storage.setItem('LOCAL_KEY_STORE_ENTRY' + ':' + key.account, this.encode(key));
  }

  list(): Array<string> {
    var list: Array<string> = [];
    for (var i=0; i<this.storage.length; i++) {
      if (isKeyStoreKey(this.storage.key(i))) {
        var key = this.storage.key(i);
        if (key) {
          list.push(key.replace('LOCAL_KEY_STORE_ENTRY:', ''));
        }
      }
    }
    return list;
  }

  remove(account: string) {
    this.storage.removeItem('LOCAL_KEY_STORE_ENTRY' + ':' + account);
  }

  encode(key: ILocalKey): string {
    var payload = JSON.stringify({
      account: key.account,
      secretPhrase: key.secretPhrase,
      pincode: key.pincode
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
      pincode: json['pincode']
    }
  }

  load(account: string, passphrase: string): ILocalKey {
    var keyName = 'LOCAL_KEY_STORE_ENTRY' + ':' + account;
    var contents = this.storage.getItem(keyName);
    try {
      return this.decode(contents, passphrase);
    } catch (e) {
      console.log(e);
    }
  }
}