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
 * TransactionTopicBuilder generates topic for use in subscribing to websocket events.
 * The topic string is a JSON array serialized to string.
 * The serialized array has the following structure.
 *
 * [
 *    # Topic type identifier. This first slot always contains the number 101.
 *    101,
 *
 *    # The second slot contains an array of arrays, each sub array has the
 *    # transaction type as its first element and the subtype as the second element.
 *    # If no filtering should be performed on matched transaction types leave the
 *    # root array empty.
 *    [[1,1],[2,3],[3,4]],
 *
 *    # The third slot contains the account filter. An account filter will only
 *    # notify about transactions where EITHER sender AND/OR recipient matches
 *    # the provided account. The account can be in RS or numeric notation.
 *    # Pass an empty string to indicate there is no account.
 *    "	FIM-Z38B-MAXH-ZHXC-DWXYX",
 *
 *    # The fourth slot contains the recipient filter. A recipient filter will
 *    # only notify about transactions where recipient EQUALS the recipient
 *    # you provided.
 *    # Pass an empty string to indicate there is no recipient.
 *    "",
 *
 *    # The fifth slot contains the sender filter. A sender filter will
 *    # only notify about transactions where sender EQUALS the sender
 *    # you provided.
 *    # Pass an empty string to indicate there is no sender.
 *    ""
 * ]
 */
class TransactionTopicBuilder implements ITopicBuilder {

  public id: number = 101;

  private types: Array<TransactionType>;
  private account_val: string;
  private recipient_val: string;
  private sender_val: string;

  constructor(...types: any[]) {
    this.types = types;
  }

  account(value: string) {
    this.account_val = value;
    return this;
  }

  recipient(value: string) {
    this.recipient_val = value;
    return this;
  }

  sender(value: string) {
    this.sender_val = value;
    return this;
  }

  topic() {
    var types = [];
    if (angular.isArray(this.types) && this.types.length > 0) {
      types.push(this.types.sort(sortTransactionType).map((type) => [type.type, type.subtype]));
    }
    var account = angular.isString(this.account_val) ? this.account_val : "";
    var recipient = angular.isString(this.recipient_val) ? this.recipient_val : "";
    var sender = angular.isString(this.sender_val) ? this.sender_val : "";

    return JSON.stringify([this.id,types,account,recipient,sender]);
  }
}

function sortTransactionType(a: TransactionType, b: TransactionType): number {
  if (a.type < b.type) return -1;
  else if (a.type > b.type) return 1;
  else if (a.subtype < b.subtype) return -1;
  else if (a.subtype > b.subtype) return 1;
  return 0;
}