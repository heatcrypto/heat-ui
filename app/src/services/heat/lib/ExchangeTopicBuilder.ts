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
 * ExchangeTopicBuilder generates topics for use in subscribing to websocket events.
 * The topic string is a JSON array serialized to string.
 * The serialized array has the following structure.
 *
  * [
  *    # Topic type identifier. This first slot always contains the number 102
  *    102,
  *
  *    # The second slot contains an asset identifier, if provided only events
  *    # matching this asset will match and will be forwarded.
  *    # Pass an empty string to indicate there is no asset and must match all assets
  *    "1234567890123456789",
  *
  *    # The third slot contains an account number, if provided events will be filtered
  *    # only if either affected buyer or seller is this account.
  *    # Pass an empty string to indicate there is no account.
  *    "FIM-Z38B-MAXH-ZHXC-DWXYX"
  * ]
  */
class ExchangeTopicBuilder implements ITopicBuilder {

  public id: number = 102;

  private account_val: string;
  private asset_val: string;

  account(value: string) {
    this.account_val = value;
    return this;
  }

  asset(value: string) {
    this.asset_val = value;
    return this;
  }
  topic() {
    var asset = angular.isString(this.asset_val) ? this.asset_val : "";
    var account = angular.isString(this.account_val) ? this.account_val : "";
    return JSON.stringify([102,asset,account]);
  }
}