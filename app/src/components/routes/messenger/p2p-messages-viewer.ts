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
    <div id="messages" layout="column" flex scroll-glue-bottom>
    
    <div ng-repeat="item in vm.items track by $index" layout="row" class="message-entry" ng-class="{outgoing: item.outgoing}">
      <md-icon md-font-library="material-icons">{{item.outgoing ? 'chat_bubble_outline' : 'comment'}}</md-icon>
      <div layout="column">
        <div class="header">
          <b ng-if="!item.outgoing">{{item.senderAccount}}&nbsp;&nbsp;&nbsp;&nbsp;</b>{{::item.dateFormatted}}
        </div>
        <div class="message-content">{{item.message}}</div>
      </div>
    </div>
    
    <!--TODO use something for infinity scrolling, e.g. https://github.com/angular-ui/ui-scroll-->
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
  items: Array<MessageHistoryItem>;

  constructor(private $scope: angular.IScope,
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

    if (this.publickey == this.user.publicKey) {
      throw Error("Same public key as logged in user");
    }

    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

    if (this.publickey != '0') {
      let room = this.p2pMessaging.getRoom(this.publickey);
      if (room) {
        room.onNewMessageHistoryItem = (item: MessageHistoryItem) => {
          this.items.push(this.processItem(item));
          this.$scope.$evalAsync(() => {
            console.log(`<<< ${item.message}`);
          });
        };
        this.items = [];
        //just load 2 last history pages (todo right later)
        let pageIndex = Math.max(0, room.getMessageHistory().getPageCount() - 2);
        while (pageIndex < room.getMessageHistory().getPageCount()) {
          this.items = this.items.concat(room.getMessageHistory().getItems(pageIndex).map(v => this.processItem(v)));
          pageIndex++;
        }
      }
    }
  }

  private processItem(item: MessageHistoryItem) {
    item['senderAccount'] = heat.crypto.getAccountIdFromPublicKey(item.fromPeer);
    item['outgoing'] = this.user.account == item['senderAccount'];
    item['dateFormatted'] = dateFormat(item.timestamp, this.dateFormat);
    return item;
  }

}
