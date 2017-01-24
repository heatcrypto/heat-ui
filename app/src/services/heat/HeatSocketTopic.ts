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
class HeatSocketTopic {

  public listeners: Array<Function> = [];

  constructor(public topic: string,
              public params: IStringHashMap<string>) {}

  public subscribe() {
    return {
      op: "subscribe",
      data: {
        topic: this.topic,
        params: this.params
      }
    }
  }

  public unsubscribe() {
    return {
      op: "unsubscribe",
      data: {
        topic: this.topic,
        params: this.params
      }
    }
  }

  public equals(other: HeatSocketTopic): boolean {
    if (other.topic == this.topic) {
      var names = Object.getOwnPropertyNames(this.params);
      var otherNames = Object.getOwnPropertyNames(other.params);
      if (names.length == otherNames.length) {
        for (var i=0; i<names.length; i++) {
          if (this.params[names[i]] != other.params[names[i]]) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }
}