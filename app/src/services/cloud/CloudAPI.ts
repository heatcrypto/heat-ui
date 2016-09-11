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
class CloudAPI implements ICloudAPI {

  constructor(private cloud: CloudService,
              private user: UserService,
              private $q: angular.IQService,
              private address: AddressService) {}

  canAccess(): angular.IPromise<any> {
    return this.cloud.send("canAccess", { account: this.user.accountRS }, true);
  }

  getPayments(request: ICloudGetPaymentsRequest): angular.IPromise<Array<ICloudPayment>> {
    return this.cloud.send("payment/list", request, false, "payments");
  }

  getPaymentCount(request: ICloudGetPaymentCountRequest): angular.IPromise<number> {
    return this.cloud.send("payment/count", request, false, "count");
  }

  getMessages(request: ICloudGetMessagesRequest): angular.IPromise<Array<ICloudMessage>> {
    return this.cloud.send("messaging/list", request, true, "messages");
  }

  getMessageCount(accountRS: string, otherAccountRS?: string): angular.IPromise<ICloudMessageCount> {
    var request:any = {
      accountRS: accountRS,
      otherAccountRS: otherAccountRS||""
    };
    return this.cloud.send("messaging/count", request, true);
  }

  getInbox(request?: ICloudGetInboxRequest): angular.IPromise<Array<ICloudMessage>> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/inbox", request, true, "messages");
  }

  getInboxCount(request?: ICloudGetInboxCountRequest): angular.IPromise<number> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/inbox/count", request, true, "count");
  }

  getOutbox(request?: ICloudGetOutboxRequest): angular.IPromise<Array<ICloudMessage>> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/outbox", request, true, "messages");
  }

  getOutboxCount(request?: ICloudGetOutboxCountRequest): angular.IPromise<number> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/outbox/count", request, true, "count");
  }

  getTrashed(request?: ICloudGetTrashedRequest): angular.IPromise<Array<ICloudMessage>> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/trashed", request, true, "messages");
  }

  getTrashedCount(request?: ICloudGetTrashedCountRequest): angular.IPromise<number> {
    request = angular.extend({
      accountRS: ""
    }, request || {});
    return this.cloud.send("messaging/trashed/count", request, true, "count");
  }

  updateMessageUnread(request: ICloudUpdateMessageUnreadRequest): angular.IPromise<any> {
    return this.cloud.send("messaging/unread", request, true);
  }

  setMessageFlag(request: ICloudUpdateFlagRequest): angular.IPromise<number> {
    return this.cloud.send("messaging/setflag", request, true, "status");
  }

  resetMessageFlag(request: ICloudUpdateFlagRequest): angular.IPromise<number> {
    return this.cloud.send("messaging/resetflag", request, true, "status");
  }

  saveMessage(request: ICloudSaveMessageRequest): angular.IPromise<ICloudSaveMessageResponse> {
    return this.cloud.send("messaging/save", request, true);
  }

  findMessage(id: string): angular.IPromise<ICloudMessage> {
    return this.cloud.send("messaging/find", { id: id }, true);
  }

  getMessageContacts(request: ICloudGetMessageContactsRequest): angular.IPromise<Array<ICloudMessageContact>> {
    return this.cloud.send("messaging/latest", request, true, "latest");
  }

  searchAccountIdentifiers(query: string, request?: ICloudSearchAccountIdentifiersRequest): angular.IPromise<Array<ICloudSearchAccountIdentifiersResponse>> {
    request = request || {};
    request.query = query;
    if (!angular.isDefined(request.firstIndex)) {
      request.firstIndex = 0;
    }
    if (!angular.isDefined(request.lastIndex)) {
      request.lastIndex = 15;
    }
    if (!angular.isDefined(request.accountColorId)) {
      request.accountColorId = "0";
    }
    if (!angular.isDefined(request.requirePublicKey)) {
      request.requirePublicKey = true;
    }
    return this.cloud.send("search/identifier", request, true, "accounts");
  }

  /* Also supports numeric id's should really be renamed */
  getPublicKey(accountRS: string): angular.IPromise<string> {
    var deferred = this.$q.defer();
    this.cloud.send("search/publickey", {accountRS: accountRS}, false, "publicKey").then(
      (publicKey) => {
        if (angular.isString(publicKey)) {
          var id = heat.crypto.getAccountIdFromPublicKey(publicKey);
          var rs = this.address.numericToRS(id);
          if (rs == accountRS || id == accountRS) {
            deferred.resolve(publicKey);
            return;
          }
          else {
            console.log("Cloud publickey/find returns invalid publicKey", {
              expected: accountRS,
              got: rs
            });
          }
        }
        deferred.reject();
      },
      deferred.reject
    );
    return deferred.promise;
  }

  getAccount(accountRS: string): angular.IPromise<ICloudAccount> {
    return this.cloud.send("search/account", {accountRS: accountRS});
  }

  register(request: ICloudRegisterRequest): angular.IPromise<any> {
    return this.cloud.send("register", request);
  }

  getIcoPaymentCount(sender: string, currency: string): angular.IPromise<number> {
    return this.cloud.send("claim/count", {sender:sender, currency:currency}, true, "count");
  }

  startClaimProcess(sender: string, currency: string): angular.IPromise<any> {
    return this.cloud.send("claim/start", {sender:sender, currency:currency}, true);
  }
}