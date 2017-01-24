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
class ExchangeObserver implements ITopicObserver {

  static id: number = 102;

  /* Unregister function returned from ISocket.subscribe, this is assigned in Socket.observe */
  destroy: Function;

  private create_trade_fn: Array<Function> = [];
  private update_trade_fn: Array<Function> = [];
  private remove_trade_fn: Array<Function> = [];

  private create_bid_fn: Array<Function> = [];
  private update_bid_fn: Array<Function> = [];
  private remove_bid_fn: Array<Function> = [];

  private create_ask_fn: Array<Function> = [];
  private update_ask_fn: Array<Function> = [];
  private remove_ask_fn: Array<Function> = [];

  private create_fn: Array<Function> = [];
  private update_fn: Array<Function> = [];
  private remove_fn: Array<Function> = [];

  /* Callback for ISocket.subscribe() */
  observe(data) {
    switch (data.target) {
      case 'trade': {
        switch (data.type) {
          case 'create': {
            this.create_fn.forEach((fn) => { fn() });
            this.create_trade_fn.forEach((fn) => { fn(data.trade) });
            break;
          }
          case 'update': {
            this.update_fn.forEach((fn) => { fn() });
            this.update_trade_fn.forEach((fn) => { fn(data.trade) });
            break;
          }
          case 'remove': {
            this.remove_fn.forEach((fn) => { fn() });
            this.remove_trade_fn.forEach((fn) => { fn(data.trade) });
            break;
          }
        }
        break;
      }
      case 'bidorder': {
        switch (data.type) {
          case 'create': {
            this.create_fn.forEach((fn) => { fn() });
            this.create_bid_fn.forEach((fn) => { fn(data.order) });
            break;
          }
          case 'update': {
            this.update_fn.forEach((fn) => { fn() });
            this.update_bid_fn.forEach((fn) => { fn(data.order) });
            break;
          }
          case 'remove': {
            this.remove_fn.forEach((fn) => { fn() });
            this.remove_bid_fn.forEach((fn) => { fn(data.order) });
            break;
          }
        }
        break;
      }
      case 'askorder': {
        switch (data.type) {
          case 'create': {
            this.create_fn.forEach((fn) => { fn() });
            this.create_ask_fn.forEach((fn) => { fn(data.order) });
            break;
          }
          case 'update': {
            this.update_fn.forEach((fn) => { fn() });
            this.update_ask_fn.forEach((fn) => { fn(data.order) });
            break;
          }
          case 'remove': {
            this.remove_fn.forEach((fn) => { fn() });
            this.remove_ask_fn.forEach((fn) => { fn(data.order) });
            break;
          }
        }
        break;
      }
    }
  }

  add(func: Function) {
    this.create_fn.push(func);
    return this;
  }

  update(func: Function) {
    this.update_fn.push(func);
    return this;
  }

  remove(func: Function) {
    this.remove_fn.push(func);
    return this;
  }

  addTrade(func: Function) {
    this.create_trade_fn.push(func);
    return this;
  }

  updateTrade(func: Function) {
    this.update_trade_fn.push(func);
    return this;
  }

  removeTrade(func: Function) {
    this.remove_trade_fn.push(func);
    return this;
  }

  addBid(func: Function) {
    this.create_bid_fn.push(func);
    return this;
  }

  updateBid(func: Function) {
    this.update_bid_fn.push(func);
    return this;
  }

  removeBid(func: Function) {
    this.remove_bid_fn.push(func);
    return this;
  }

  addAsk(func: Function) {
    this.create_ask_fn.push(func);
    return this;
  }

  updateAsk(func: Function) {
    this.update_ask_fn.push(func);
    return this;
  }

  removeAsk(func: Function) {
    this.remove_ask_fn.push(func);
    return this;
  }
}