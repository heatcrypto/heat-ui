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

interface ICloudAPI {
  canAccess(): angular.IPromise<any>;

  getPayments(request: ICloudGetPaymentsRequest): angular.IPromise<Array<ICloudPayment>>;
  getPaymentCount(request: ICloudGetPaymentCountRequest): angular.IPromise<number>;

  getMessages(request: ICloudGetMessagesRequest): angular.IPromise<Array<ICloudMessage>>;
  getMessageCount(accountRS: string, otherAccountRS: string): angular.IPromise<ICloudMessageCount>;
  updateMessageUnread(request: ICloudUpdateMessageUnreadRequest): angular.IPromise<any>;
  saveMessage(request: ICloudSaveMessageRequest): angular.IPromise<ICloudSaveMessageResponse>;
  findMessage(id: string): angular.IPromise<ICloudMessage>;
  getMessageContacts(request: ICloudGetMessageContactsRequest): angular.IPromise<Array<ICloudMessageContact>>;

  getInbox(request?: ICloudGetInboxRequest): angular.IPromise<Array<ICloudMessage>>;
  getInboxCount(request?: ICloudGetInboxCountRequest): angular.IPromise<number>;
  getOutbox(request?: ICloudGetOutboxRequest): angular.IPromise<Array<ICloudMessage>>;
  getOutboxCount(request?: ICloudGetOutboxCountRequest): angular.IPromise<number>;
  getTrashed(request?: ICloudGetTrashedRequest): angular.IPromise<Array<ICloudMessage>>;
  getTrashedCount(request?: ICloudGetTrashedCountRequest): angular.IPromise<number>;

  setMessageFlag(request: ICloudUpdateFlagRequest): angular.IPromise<any>;
  resetMessageFlag(request: ICloudUpdateFlagRequest): angular.IPromise<any>;

  searchAccountIdentifiers(query: string, request?: ICloudSearchAccountIdentifiersRequest): angular.IPromise<Array<ICloudSearchAccountIdentifiersResponse>>; // accounts

  getPublicKey(account: string): angular.IPromise<string>;

  getAccount(accountRS: string): angular.IPromise<ICloudAccount>;

  register(request: ICloudRegisterRequest): angular.IPromise<any>;
  getIcoPaymentCount(sender: string, currency: string): angular.IPromise<number>;
  startClaimProcess(sender: string, currency: string): angular.IPromise<any>;
}

interface ICloudAccount {
  accountRS: string;
  accountName: string;
  accountEmail: string;
  publicKey: string;
}

interface ICloudGetPaymentsRequest {
  accountRS: string;
  firstIndex: number;
  lastIndex: number;
  /* Available columns: "sender_id", "recipient_id", "timestamp" */
  sortColumn: string;
  sortAsc: boolean;
}

interface ICloudGetPaymentCountRequest {
  accountRS?: string;
}

interface ICloudPayment {
  transactionId: string,
  recipient: string,
  recipientRS: string,
  recipientPublicKey: string,
  recipientIdentifier: string,
  sender: string,
  senderRS: string,
  senderPublicKey: string,
  senderIdentifier: string,
  amount: string,
  fee: string,
  timestamp: number,
  message: ICloudMessage,
  height: number,
  transactionIdex: number,
  confirmed: boolean
}

interface ICloudGetMessagesRequest {
  accountRS: string;
  firstIndex: number;
  lastIndex: number;
  /* Available columns:
      "timestamp","sender_id","recipient_id" */
  sortColumn: string;
  sortAsc: boolean;
}

interface ICloudMessage {
  id: string;
  unread: boolean;
  recipientStatus: number;
  senderStatus: number;
  sender: string;
  senderRS: string;
  senderName: string;
  senderEmail: string;
  senderPublicKey: string;
  recipient: string;
  recipientRS: string;
  recipientName: string;
  recipientEmail: string;
  recipientPublicKey: string;
  timestamp: number;
  blockchain: boolean;
  isText: boolean;
  data: string;
  nonce: string;
  payment?: ICloudPayment;
  confirmed: boolean;
}

interface ICloudUpdateMessageUnreadRequest {
  id: string;
  unread: boolean;
}

interface ICloudSaveMessageRequest {
  senderRS: string;
  recipientRS: string;
  isText: boolean;
  data: string;
  nonce: string;
}

interface ICloudSaveMessageResponse {
  id: string;
}

interface ICloudFindMessageRequest {
  id: string;
}

interface ICloudMessageCount {
  unread: number;
  sent: number;
  received: number;
  total: number;
}

interface ICloudGetMessageContactsRequest {
  accountRS: string;
  firstIndex: number;
  lastIndex: number;
}

interface ICloudMessageContact {
  account: string;
  accountRS: string;
  accountName: string;
  accountEmail: string;
  accountPublicKey: string;
  unread: number;
  latestTimestamp: number;
}

interface ICloudSearchAccountIdentifiersRequest {
  query?: string;
  accountColorId?: string;
  firstIndex?: number;
  lastIndex?: number;
  requirePublicKey?: boolean;
}

interface ICloudSearchAccountIdentifiersResponse {
  accountName: string;
  accountColorId: string;
  accountColorName: string;
  accountEmail: string;
  account: string;
  accountRS: string;
  accountPublicKey: string;
}

interface ICloudGetInboxCountRequest {
  accountRS?: string;
}

interface ICloudGetInboxRequest {
  accountRS?: string;
  firstIndex?: number;
  lastIndex?: number;
  /**
   * Available columns:
   * timestamp, sender_id, recipient_id
   * */
  sortColumn: string;
  sortAsc: boolean;
}

interface ICloudGetOutboxRequest {
  accountRS?: string;
  firstIndex?: number;
  lastIndex?: number;
  /**
   * Available columns:
   * timestamp, sender_id, recipient_id
   * */
  sortColumn: string;
  sortAsc: boolean;
}

interface ICloudGetOutboxCountRequest {
  accountRS?: string;
}

interface ICloudGetTrashedCountRequest {
  accountRS?: string;
}

interface ICloudGetTrashedRequest {
  accountRS?: string;
  firstIndex?: number;
  lastIndex?: number;
  /**
   * Available columns:
   * timestamp, sender_id, recipient_id
   * */
  sortColumn: string;
  sortAsc: boolean;
}

interface ICloudUpdateFlagRequest {
  id: string;
  flag: number;
}

interface ICloudRegisterRequest {
  captcha: string;
  publicKey: string;
}