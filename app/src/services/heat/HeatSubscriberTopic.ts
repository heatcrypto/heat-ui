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
class HeatSubscriberTopic {

  public listeners: Array<(any)=> void> = [];
  private subscribed: boolean = false;

  constructor(public topicId: string, public params: any) {
    if (!angular.isString(topicId))
      throw new Error("Topic must be a string");
    if (!angular.isObject(params))
      throw new Error("Params must be an object");
    var names = Object.getOwnPropertyNames(params);
    names.forEach(key => {
      if (!angular.isString(params[key]))
        throw new Error(`Params property ${key} is not a string`);
    })
  }

  public setSubscribed(subscribed: boolean) {
    this.subscribed = subscribed;
  }

  public isSubscribed(): boolean {
    return this.subscribed;
  }

  public addListener(callback: (any)=> void) {
    if (this.listeners.find(cb => cb === callback))
      throw new Error("Duplicate listener");
    this.listeners.push(callback);
  }

  public removeListener(callback: (any)=> void) {
    this.listeners = this.listeners.filter(c => c !== callback);
  }

  public isEmpty(): boolean {
    return this.listeners.length == 0;
  }

  public equals(other: HeatSubscriberTopic): boolean {
    if (this.topicId != other.topicId) return false;
    return this.objectEquals(this.params, other.params);
  }

  private objectEquals(a: Object, b: Object): boolean {
    let namesA = Object.getOwnPropertyNames(a);
    let namesB = Object.getOwnPropertyNames(b);
    if (namesA.length != namesB.length) return false;
    for (var i=0; i<namesA.length; i++) {
      let key = namesA[i];
      if (a[key] != b[key]) return false;
    }
    return true;
  }
}