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
@Component({
  selector: 'messageBatchViewer',
  inputs: ['publickey'],
  styles: [`
    message-batch-viewer .message-item {
      min-height: 80px;
    }
  `],
  template: `
    <div layout="column" flex>
      <div class="scroll-up" layout="row" flex ng-show="vm.canScrollUp" layout-align="center">
        <md-button ng-click="vm.scrollUp()">Go up</md-button>
      </div>
      <div layout="column">
        <div layout="column" ng-repeat="batch in vm.batches | orderBy:'-'">
          <div layout="column" ng-repeat="entry in batch.entries">
            <message-batch-entry id="{{::entry.__id}}" message="entry" flex="none" class="message-item"></message-batch-entry>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','$q','$timeout','$document','engine','user','cloud','settings')
class MessageBatchViewerComponent extends AbstractBatchViewerComponent {

  private data = [];
  private buildTestData(size: number) {
    for (var i=0; i<size; i++) {
      this.data.push({
        name: "Name "+i,
        index: i,
        sender: "33873874972872987",
        date: "22-03-2013 12:57PM"
      });
    }
  }

  private publickey: string; // @input

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private $document: angular.IDocumentService,
              private engine: EngineService,
              private user: UserService,
              private cloud: CloudService,
              private settings: SettingsService) {
    super($scope, $q);
    this.buildTestData(105);

    var topic = new TransactionTopicBuilder().account(this.user.account);
    var observer = engine.socket().observe<TransactionObserver>(topic)
        .add(angular.bind(this, this.onMessageAdded))
        .remove(angular.bind(this, this.onMessageRemoved))
        .confirm(angular.bind(this, this.onMessageConfirmed));

    $scope.$on("$destroy",() => { observer.destroy() });
    this.loadInitial();
  }

  loadInitial() {
    var deferred = this.$q.defer();
    this.clear();
    this.getBatch(0).then((batch) => {
      this.$scope.$evalAsync(() => { // ensure contents are rendered
        this.$timeout(500).then(() => { // resolve promise in next event loop
          deferred.resolve();
        });
      })
    });
    deferred.promise.then(() => {
      this.goTo(this.getFirst().getLast().__id, 0, 1000);
    });
    return deferred.promise;
  }

  /* websocket event listener */
  onMessageAdded() {
    this.getFirst().loadMore().then(() => {
      // scroll to the new last element
      this.goTo(this.getFirst().getLast().__id, 0, 100);
    });
  }

  /* websocket event listener */
  onMessageRemoved() {

  }

  /* websocket event listener */
  onMessageConfirmed() {

  }

  goTo(id: string, offset?: number, duration?: number) : angular.IPromise<any> {
    var container = <duScroll.IDocumentService> angular.element(document.getElementById("message-batch-container"));
    var element = angular.element(document.getElementById(id));
    var _offset = offset || 30;
    var _duration = duration || 2000;
    return container.duScrollToElement(element, _offset, _duration, heat.easing.easeOutCubic);
  }

  getCount() : angular.IPromise<number> {
    var deferred = this.$q.defer();
    // this.$timeout(1000).then(() => { deferred.resolve(this.data.length) });
    this.cloud.api.getMessageCount(
        this.user.accountRS,
        heat.crypto.getAccountIdFromPublicKey(this.publickey)
      )
      .then((total) => {
        deferred.resolve(total.total)
      },
      deferred.reject);
    return deferred.promise;
  }
  getItems(firstIndex: number, lastIndex: number) : angular.IPromise<Array<any>> {
    var deferred = this.$q.defer();
    // this.$timeout(1000).then(() => { deferred.resolve(this.data.slice(firstIndex, lastIndex)) });
    var request: ICloudGetMessagesRequest = {
      accountRS: heat.crypto.getAccountIdFromPublicKey(this.publickey),
      firstIndex: firstIndex,
      lastIndex: lastIndex,
      sortAsc: true,
      sortColumn: 'timestamp'
    }
    this.cloud.api.getMessages(request).then((messages) => {
      deferred.resolve(messages.map((message) => {
        var date = utils.timestampToDate(message.timestamp);
        var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        message['date'] = dateFormat(date, format);
        message['outgoing'] = this.user.accountRS == message.senderRS;
        message['contents'] = this.decryptMessage(message);
        return message;
      }));
    })
    return deferred.promise;
  }

  decryptMessage(message: ICloudMessage) {
    if (message.recipientRS == this.user.accountRS) {
      return heat.crypto.decryptMessage(message.data, message.nonce, message.senderPublicKey, this.user.secretPhrase);
    }
    else if (message.senderRS == this.user.accountRS) {
      return heat.crypto.decryptMessage(message.data, message.nonce, message.recipientPublicKey, this.user.secretPhrase);
    }
    return "[Encrypted]";
  }
}