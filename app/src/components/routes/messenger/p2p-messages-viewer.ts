/*
 * The MIT License (MIT)
 * Copyright (c) 2019 Heat Ledger Ltd.
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
  selector: 'p2pMessagesViewer',
  inputs: ['publickey','@containerId'],
  styles: [`
    .messages {
      overflow: auto;
    }    
    .message-entry {
      color: white;
      margin-bottom: 14px;
      margin-right: 10px;
      max-width: 85%;
    }
    .message-entry .message-content {
      white-space: pre-line;
    }
    .message-entry md-icon {
      color: green;
      margin: 0 12px 0 0;
    }
    .message-entry .header {
      padding-bottom: 6px;
      color: grey;
    }
    .outgoing {
      align-self: flex-end;
    }
  `],
  template: `
<!--<div class="viewport-wrap" id="viewport-scrollBubblingPrevent-wrap">
  <div class="viewport viewport-height-fixed" id="viewport-scrollBubblingPrevent" ui-scroll-viewport>
    <div class="item" ui-scroll="item in datasource"  is-loading="loading">{{item}}</div>
  </div>
</div>-->

<div class="messages" ui-scroll-viewport layout="column" flex scroll-glue>

  <div ui-scroll="item in vm.datasource" buffer-size="20" adapter="adapter"
  layout="row" class="message-entry" ng-class="{outgoing: item.outgoing}">
    <md-icon md-font-library="material-icons">{{item.outgoing ? 'chat_bubble_outline' : 'comment'}}</md-icon>
    <div layout="column">
      <div class="header">
        <b ng-if="!item.outgoing">{{item.senderAccount}}&nbsp;&nbsp;&nbsp;&nbsp;</b>{{::item.dateFormatted}}
      </div>
      <div class="message-content">{{item.i}} {{item.message}}</div>
    </div>
  </div>

</div>
  `
})
@Inject('$scope','$q','$timeout','$document','heat','user','settings',
        'render','controlCharRender','storage', 'P2PMessaging')
class P2PMessagesViewerComponent {

  private publickey: string; // @input
  private containerId: string; // @input
  private store: Store;
  private dateFormat;
  // items: Array<p2p.MessageHistoryItem>;
  datasource: P2PMessagesDataSource;

  constructor(private $scope: angular.IScope,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private $document: angular.IDocumentService,
              private heat: HeatService,
              private user: UserService,
              private settings: SettingsService,
              private render: RenderService,
              private controlCharRender: ControlCharRenderService,
              private storage: StorageService,
              private p2pMessaging: P2PMessaging) {

    if (this.publickey == this.user.publicKey) {
      throw Error("Same public key as logged in user");
    }

    this.updateSeenTime();
    $scope.$on('$destroy', () => this.updateSeenTime());

    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    if (this.publickey != '0') {
      let room = this.p2pMessaging.getOneToOneRoom(this.publickey, true);
      if (room) {
        room.onNewMessageHistoryItem = (item: p2p.MessageHistoryItem) => {
          // @ts-ignore
          let adapter = $scope.adapter;
          if (adapter.isEOF()) {
            adapter.append([this.processItem(item)]);
          }
          // this.items.push(this.processItem(item));
          this.$scope.$evalAsync(() => {
            console.log(`<<< ${item.message}`);
          });
        };
        this.datasource = new P2PMessagesDataSource(room.getMessageHistory(), item => this.processItem(item));
      }
    }
  }

  private processItem(item: p2p.MessageHistoryItem) {
    item['senderAccount'] = heat.crypto.getAccountIdFromPublicKey(item.fromPeer);
    item['outgoing'] = this.user.account == item['senderAccount'];
    item['dateFormatted'] = dateFormat(item.timestamp, this.dateFormat);
    return item;
  }

  /**
   * The seen time is needed to display mark for contact when it receives the new unread messages.
   */
  private updateSeenTime() {
    let account = heat.crypto.getAccountIdFromPublicKey(this.publickey);
    this.storage.namespace('contacts.seenP2PMessageTimestamp').put(account, Date.now() - 500);
  }

}

class P2PMessagesDataSource {
  data = [];
  first = 1;

  constructor(private messageHistory: p2p.MessageHistory,
              private processItem: (item: p2p.MessageHistoryItem) => {}) {
  }

  get(index: number, count: number, success) {
    let start = index;
    let end = Math.min(index + count - 1, this.first);

    if (start <= end) {
      let lastIndex = this.messageHistory.getItemCount() - 1;
      let items = this.messageHistory.getItemsScroolable(lastIndex + start - this.first, lastIndex + end - this.first + 1)
        .map(item => this.processItem(item));
      success(items);
    } else {
      success([]);
    }

  }

}
