/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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
interface IEventListenerFunction {
  (...arg: Array<any>): any;
}

class EventEmitter {

  private cache: EventEmitterCache;

  constructor() {
    this.cache = new EventEmitterCache();
  }

  addListener(event: string, listener: IEventListenerFunction) {
    this.cache.add(event, listener);
  }

  removeListener(event: string, listener: IEventListenerFunction) {
    this.cache.remove(event, listener);
  }

  on(event: string, listener: IEventListenerFunction) {
    this.addListener(event, listener);
  }

  removeAllListeners(event?: string) {
    if (angular.isDefined(event)) {
      this.cache.get(event).forEach((listener) => {
        this.cache.remove(event, listener);
      })
    }
    else {
      this.cache.clear();
    }
  }

  emit(event: string, ...args: Array<any>) {
    this.cache.get(event).forEach((listener) => {
      listener.apply(null, args);
    });
  }
}

class EventEmitterCache {

  private cache: any = {};

  clear() {
    this.cache = {};
  }

  add(event: string, listener: IEventListenerFunction) {
    if (!angular.isDefined(this.cache[event])) {
      this.cache[event] = [];
    }
    this.cache[event].push(listener);
  }

  remove(event: string, listener: IEventListenerFunction) {
    if (angular.isDefined(this.cache[event])) {
      this.cache[event] = this.cache[event].filter((l) => l != listener);
      if (this.cache[event].length === 0) {
        delete this.cache[event];
      }
    }
  }

  get(event: string): Array<IEventListenerFunction> {
    return this.cache[event] || [];
  }
}