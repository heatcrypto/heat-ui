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
@Service('storage')
class StorageService {
  public namespace(namespace: string) : Store {
    return new Store(namespace);
  }
}

class Store {
  private prefix: string;
  constructor(public namespace: string) {
    if (!angular.isString(namespace) || !utils.emptyToNull(namespace))
      throw new Error('Illegal argument, namespace must be a non-empty string');
    this.prefix = namespace + ".";
  }

  public clear() {
    this.forEach((namespacedKey) => { this.remove(namespacedKey) });
  }

  public remove(path: string) {
    localStorage.removeItem(this.prefix + path)
  }

  public put(path: string, val: any) {
    localStorage.setItem(this.prefix + path, JSON.stringify(val));
  }

  public get(path: string): any {
    return this.read(path);
  }

  public getObject<T>(path: string): T {
    return this.read(path);
  }

  public getNumber(path: string): number {
    return this.read(path);
  }

  public getBoolean(path: string): boolean {
    return this.read(path);
  }

  public getString(path: string): string {
    return this.read(path);
  }

  public forEach(callbackFn: (namespacedKey: string, value?: any, fullyQualifiedKey?: string)=>void) {
    this.keys().forEach((namespacedKey) => {
      if (callbackFn.length > 1)
        callbackFn(namespacedKey, this.get(namespacedKey), this.prefix + namespacedKey);
      else
        callbackFn(namespacedKey);
    });
  }

  public keys() : Array<string> {
    var keys = [];
    var fullyQualifiedKey: string, namespacedKey: string;
    for (var i=0; i<localStorage.length; i++) {
      fullyQualifiedKey = localStorage.key(i);
      if (fullyQualifiedKey.indexOf(this.prefix) == 0) { // is this key part of this Store's namespace?
        namespacedKey = fullyQualifiedKey.substring(this.prefix.length);
        keys.push(namespacedKey);
      }
    }
    return keys;
  }

  private read(path: string): any {
    var text: string = localStorage.getItem(this.prefix + path);
    if (angular.isString(text)) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error(`Could not read localStorage key '${path}', throws`, e);
      }
    }
    return null;
  }
}