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
  email: string;
  accountRS: string;
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
    this.storage.setItem('LOCAL_KEY_STORE_ENTRY' + ':' + key.email, this.encode(key));
  }

  list(): Array<ILocalKey> {
    var list: Array<ILocalKey> = [];
    for (var i=0; i<this.storage.length; i++) {
      if (isKeyStoreKey(this.storage.key(i))) {
        var key = this.load(this.storage.key(i));
        if (key) {
          list.push(key);
        }
      }
    }
    return list;
  }

  remove(email: string) {
    this.storage.removeItem('LOCAL_KEY_STORE_ENTRY' + ':' + email);
  }

  find(email: string): ILocalKey {
    return this.list().find((entry) => entry.email == email);
  }

  encode(key: ILocalKey): string {
    return JSON.stringify({
      accountRS: key.accountRS,
      email: key.email.toLowerCase(),
      secretPhrase: key.secretPhrase,
      pincode: key.pincode
    });
  }

  decode(decoded: string): ILocalKey {
    return JSON.parse(decoded);
  }

  load(keyName: string): ILocalKey {
    var contents = this.storage.getItem(keyName);
    try {
      return this.decode(contents);
    } catch (e) {
      console.log(e);
    }
  }
}