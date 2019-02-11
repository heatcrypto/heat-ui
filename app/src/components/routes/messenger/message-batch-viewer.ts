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
  inputs: ['publickey','@containerId'],
  styles: [`
    message-batch-viewer .message-item {
      min-height: 80px;
    }
  `],
  template: `
    <div layout="column" flex>
      <div class="scroll-up" layout="row" flex ng-hide="vm.getParentScope().loading || vm.batches[vm.batches.length-1].firstIndex == 0" layout-align="center">
        <md-button ng-click="vm.scrollUp()" aria-label="Go up">Go up</md-button>
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
@Inject('$scope','$q','$timeout','$document','heat','user','settings',
        'render','controlCharRender','storage', 'P2PMessaging')
class MessageBatchViewerComponent extends AbstractBatchViewerComponent {

  private publickey: string; // @input
  private containerId: string; // @input
  private store: Store;
  private dateFormat;

  constructor($scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private $document: angular.IDocumentService,
              private heat: HeatService,
              private user: UserService,
              private settings: SettingsService,
              private render: RenderService,
              private controlCharRender: ControlCharRenderService,
              storage: StorageService,
              private p2pMessaging: P2PMessaging) {
    super($scope, $q, $timeout);
    this.store = storage.namespace('contacts.latestTimestamp',$scope);
    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    var refresh = utils.debounce((angular.bind(this, this.onMessageAdded)), 500, false);
    heat.subscriber.message({sender:this.user.account}, refresh, $scope);
    heat.subscriber.message({recipient:this.user.account}, refresh, $scope);

    this.loadInitial();

    if (this.publickey == this.user.publicKey) {
      throw Error("Same public key as logged in user");
    }

    if (this.publickey != '0') {
      let room = this.p2pMessaging.getRoom(this.publickey);
      if (room) {
        room.onMessage = (msg: any) => {
          this.onMessageAdded();
          console.log(`<<< ${msg.text}`);
        }
      }
    }
  }

  loadInitial() {
    var deferred = this.$q.defer();
    this.clear();
    this.$scope.$evalAsync(() => { this.getParentScope().loading = true });
    this.getBatch(0).then((batch) => {
      this.$scope.$evalAsync(() => { // ensure contents are rendered
        this.getParentScope().loading = false;
        this.$timeout(0).then(() => { // resolve promise in next event loop
          deferred.resolve();
        });
      })
    });
    deferred.promise.then(() => {
      this.goTo(this.getFirst().getLast().__id, 0, 1);
    });
    return deferred.promise;
  }

  /* websocket event listener */
  onMessageAdded() {
    var batch = this.getFirst();
    batch.loadMore().then(() => {
      var entry = batch.getLast();
      var id = entry.__id;
      this.$scope.$evalAsync(() => {
        this.$timeout(0).then(() => { // leave render loop before coming back and doing the scroll
          this.goTo(id, 0, 1000); // scroll to the new last element
        })
      })
    });
  }

  /* websocket event listener */
  onMessageRemoved() {}

  /* websocket event listener */
  onMessageConfirmed() {}

  goTo(id: string, offset?: number, duration?: number) : angular.IPromise<any> {
    var container = this.getScrollContainer();
    var element = angular.element(document.getElementById(id));
    var _offset = offset || 30;
    var _duration = duration || 2000;
    return container.duScrollToElement(element, _offset, _duration, heat.easing.easeOutCubic);
  }

  getScrollContainer() : duScroll.IDocumentService {
     return <duScroll.IDocumentService> angular.element(document.getElementById(this.containerId))
  }

  getCount() : angular.IPromise<number> {
    let promise = this.heat.api.getMessagingContactMessagesCount(this.user.account, heat.crypto.getAccountIdFromPublicKey(this.publickey));
    let room = this.p2pMessaging.getRoom(this.publickey);
    if (room) {
      let p2pItems = room.getMessageHistory().getItems(0);
      if (p2pItems && p2pItems.length > 0) {
        return promise.then(count => count + 1);
      }
    }
    return promise;
  }

  getItems(firstIndex: number, lastIndex: number) : angular.IPromise<Array<any>> {
    let deferred = this.$q.defer<Array<any>>();
    this.heat.api.getMessagingContactMessages(this.user.account, heat.crypto.getAccountIdFromPublicKey(this.publickey),
                firstIndex, lastIndex).then((messages) => {
      let index = firstIndex;

      let result = messages.map((message) => {
        var date = utils.timestampToDate(message.timestamp);
        message['date'] = dateFormat(date, this.dateFormat);
        message['outgoing'] = this.user.account == message.sender;
        message['contents'] = this.decryptMessage(message);
        message['index'] = index++;
        message['html'] = this.render.render(message['contents'], [this.controlCharRender]);
        this.updateLatestMessageReadTimestamp(message);
        return message;
      });

      //merge heat messages with p2p messages
      let room = this.p2pMessaging.getRoom(this.publickey);
      if (room) {
        let p2pItems = room.getMessageHistory().getItems(0);
        if (p2pItems) {
          this.merge(result, p2pItems);
        }
      }

      deferred.resolve(result);
    });
    return deferred.promise;
  }

  private merge(heatMessages: IHeatMessage[], p2pItems: MessageHistoryItem[]): IHeatMessage[] {
    p2pItems.forEach(p2pItem => {
      let m: IHeatMessage = {
        blockId: null,
        messageBytes: null,
        messageIsEncrypted: false,
        messageIsEncryptedToSelf: null,
        messageIsText: true,
        recipient: null,
        recipientPrivateName: null,
        recipientPublicKey: (p2pItem.fromPeer == this.publickey ? this.user.publicKey : this.publickey),
        recipientPublicName: "",
        sender: heat.crypto.getAccountIdFromPublicKey(p2pItem.fromPeer),
        senderPrivateName: null,
        senderPublicKey: p2pItem.fromPeer,
        senderPublicName: "",
        timestamp: p2pItem.timestamp,
        transaction: null
      };
      m['p2p'] = true;
      m['date'] = dateFormat(m.timestamp, this.dateFormat);
      m.timestamp = utils.epochTime(m.timestamp);  //to be compatible with IHeatMessage
      m['outgoing'] = this.user.account == m.sender;
      m['contents'] = p2pItem.message;
      m['html'] = this.render.render(m['contents'], [this.controlCharRender]);
      //todo this.updateLatestMessageReadTimestamp(message);
      heatMessages.push(m);
    });
    heatMessages.sort((a, b) => a.timestamp - b.timestamp);
    return heatMessages;
  }

  decryptMessage(message: IHeatMessage) {
    return this.heat.getHeatMessageContents(message);
  }

  updateLatestMessageReadTimestamp(message: IHeatMessage) {
    var account = this.user.account == message.sender ? message.recipient : message.sender;
    var latestTimestamp = this.store.getNumber(account, 0);
    if (message.timestamp > latestTimestamp) {
      this.store.put(account, message.timestamp);
    }
  }
}
