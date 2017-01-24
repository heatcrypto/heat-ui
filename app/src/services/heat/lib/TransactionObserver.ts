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

/**
 * Usage
 *
 * var socket: ISocket;
 * class XX {
 *   init($scope) {
 *     var topic = new TransactionTopicBuilder().account('FIM-xxx');
 *     var observer = socket.observe(topic).
 *     add((transaction) => {
 *     }).
 *     confirm((id, height) => {
 *     }).
 *     remove((id) => {
 *     });
 *     $scope.$on('$destroy', observer.destroy);
 *   }
 * }
 */
class TransactionObserver implements ITopicObserver {

  static id: number = 101;

  /* Unregister function returned from ISocket.subscribe, this is assigned in Socket.observe */
  destroy: Function;

  private add_fn: Array<Function> = [];
  private confirm_fn: Array<Function> = [];
  private remove_fn: Array<Function> = [];
  private require_fn: Array<Function> = [];
  private filter_fn: Array<Function> = [];

  /* Callback for ISocket.subscribe() */
  observe(data) {
    switch (data.type) {
      case 'add': {
        data.transactions.forEach((transaction) => {

          /* Transaction must be required by at least 1 require function */
          if (this.require_fn.length > 0) {
            var success = false;
            for (var i=0; i<this.require_fn.length; i++) {
              if (this.require_fn[i](transaction)) {
                success = true;
                break;
              }
            }
            if (!success) return;
          }

          /* Transaction must pass all filter functions */
          if (this.filter_fn.length > 0) {
            for (var i=0; i<this.filter_fn.length; i++) {
              if (!this.filter_fn[i](transaction)) {
                return;
              }
            }
          }

          /* Pass to all add handlers */
          this.add_fn.forEach((fn) => { fn(transaction) });
        });
        break;
      }
      case 'confirm': {
        data.transactions.forEach((id) => {
          this.confirm_fn.forEach((fn) => { fn(id, data.height) });
        });
        break;
      }
      case 'remove': {
        data.transactions.forEach((id) => {
          this.remove_fn.forEach((fn) => { fn(id) });
        });
        break;
      }
    }
  }

  /**
   * Callback for when a transaction was first received from a peer (transaction becomes
   * unconfirmed for the first time).
   * Not all transactions are passed to add, only if they are matched by require and filter
   * functions will they appear in add.
   *
   * @param func Function that receives a single IUnconfirmedTransaction.
   * */
  add(func: Function) {
    this.add_fn.push(func);
    return this;
  }

  /**
   * Callback for when a transaction was first included in a block and is confirmed for a
   * first time. Only the transaction id is provided.
   * All transaction ids are passed to confirm, no test is performed for require or filter.
   *
   * @param func Function that receives a transaction id:string.
   * */
  confirm(func: Function) {
    this.confirm_fn.push(func);
    return this;
  }

  /**
   * Callback for when a transaction was removed from a block, it becomes unconfirmed.
   * Only the transaction id is provided.
   * All transaction ids are passed to confirm, no test is performed for require or filter.
   *
   * @param func Function that receives a transaction id:string.
   * */
  remove(func: Function) {
    this.remove_fn.push(func);
    return this;
  }

  /* Assign 0 or more requirements, before transactions are passed on to onAdd, onConfirm, onRemove
     they must receive a 'true' result from AT LEAST ONE require function.
     Multiple require functions can be assigned to any observer. */
  require(func: Function) {
    this.require_fn.push(func);
    return this;
  }

  /* Assign 0 or more filters, before transactions are passed on to onAdd, onConfirm, onRemove
     they must receive a 'true' from ALL filter functions.
     Multiple filter functions can be assigned to any observer. */
  filter(func: Function) {
    this.filter_fn.push(func);
    return this;
  }
}