/// <reference path='../lib/EventEmitter.ts'/>
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

  private stores: IStringHashMap<Array<Store>> = {};
  private user: UserService;

  /**
   * Creates a namespaced Store object
   *
   * @param namespace String
   *    The storage namespace, meaning all keys are prepended with this namespace and
   *    a dot '.' before they are passed on to the real storage backend
   * @param $scope IScope
   *    Optional $scope object, if provided the Store will be removed and unregistered
   *    when the scope is destroyed
   * @param globalScope Boolean
   *    Optional argument indicating that unlike the default behavior (where we include
   *    the current signed in user account into the namespace key) we want the namespace
   *    to be used as. This is meant for properties that are accessible to all users.
   */
  public namespace(namespace: string, $scope?: angular.IScope, globalScope?: boolean) : Store {
    var store = new Store(namespace, this);
    if ($scope) {
      $scope.$on('$destroy',() => {
        this.removeStore(store)
      });
    }
    this.addStore(store);
    if (!angular.isDefined(globalScope) || !globalScope) {
      this.user = this.user || <UserService> heat.$inject.get('user'); // causes circular dependency if done through DI.
      if (this.user.unlocked) {
        if(this.user.key)
          store.enable(this.user.key.account);
        else
          store.enable(this.user.account)
      }
      else {
        var closure = () => {
          this.user.removeListener(UserService.EVENT_UNLOCKED, closure);
          if(this.user.key)
            store.enable(this.user.key.account);
          else
            store.enable(this.user.account)
        }
        this.user.on(UserService.EVENT_UNLOCKED, closure);
      }
    }
    else {
      store.enable();
    }
    return store;
  }

  private addStore(store: Store) {
    (this.stores[store.namespace] = this.stores[store.namespace] || []).push(store);
  }

  private removeStore(store: Store) {
    if (angular.isArray(this.stores[store.namespace])) {
      this.stores[store.namespace] = this.stores[store.namespace].filter((s) => s != store);
      if (this.stores[store.namespace].length == 0) {
        delete this.stores[store.namespace];
      }
    }
    store.removeAllListeners();
  }

  public emit(namespace: string, event: string, ...args: Array<any>) {
    var ns = this.stores[namespace];
    if (angular.isArray(ns)) {
      ns.forEach((store) => {
        store.emit.apply(store, [event].concat(args))
      });
    }
  }
}

class Store extends EventEmitter {

  public static EVENT_PUT = 'put';
  public static EVENT_REMOVE = 'remove';

  private prefix: string;
  private enabled: boolean = false;

  constructor(public namespace: string, private storage: StorageService) {
    super();
    if (!angular.isString(namespace) || !utils.emptyToNull(namespace))
      throw new Error('Illegal argument, namespace must be a non-empty string');
  }

  public enable(userScope?: string) {
    this.prefix = this.namespace + ".";
    if (angular.isDefined(userScope)) {
      this.prefix = userScope + "." + this.prefix;
    }
    this.enabled = true;
  }

  public disable() {
    this.enabled = false;
  }

  private ensureIsEnabled() {
    if (!this.enabled) {
      throw new Error('Store not enabled. Are you accessing a user scoped Store without a user being signed in?');
    }
  }

  public clear() {
    this.forEach((namespacedKey) => { this.remove(namespacedKey) });
  }

  public remove(path: string) {
    this.ensureIsEnabled();
    var key = this.prefix + path;
    localStorage.removeItem(key);
    this.storage.emit(this.namespace, Store.EVENT_REMOVE, key);
  }

  public put(path: string, val: any) {
    this.ensureIsEnabled();
    var key = this.prefix + path, value = JSON.stringify(val)
    localStorage.setItem(key, value);
    this.storage.emit(this.namespace, Store.EVENT_PUT, key, value);
  }

  public get(path: string, defaultValue?: any): any {
    return this.read(path, defaultValue);
  }

  public getObject<T>(path: string, defaultValue?: T): T {
    return this.read(path, defaultValue);
  }

  public getNumber(path: string, defaultValue?: number): number {
    return this.read(path, defaultValue);
  }

  public getBoolean(path: string, defaultValue?: boolean): boolean {
    return this.read(path, defaultValue);
  }

  public getString(path: string, defaultValue?: string): string {
    return this.read(path, defaultValue);
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

  private read(path: string, defaultValue?: any): any {
    this.ensureIsEnabled();
    var text: string = localStorage.getItem(this.prefix + path);
    if (angular.isString(text)) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error(`Could not read localStorage key '${path}', throws`, e);
      }
    }
    return angular.isDefined(defaultValue) ? defaultValue : null;
  }
}