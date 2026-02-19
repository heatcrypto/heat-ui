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
  inputs: ['publickey', '@containerId'],
  styles: [`
    .messages {
      overflow: auto;
      font-size: 14px;
    }
    .message-entry {
      color: white;
      margin-bottom: 24px;
      margin-right: 10px;
      // max-width: 85%;
    }
    .message-entry .message-content {
      white-space: pre-line;
    }
    .message-entry md-icon {
      color: green;
      margin: 0 12px 0 0;
    }
    .message-entry md-icon.transportserver {
      color: skyblue;
    }
    .message-entry .header {
      padding-bottom: 6px;
      color: grey;
    }
    .message-entry .menu-button {
      color: grey !important;
    }
    .message-entry div.message {
      width: 100%;
    }
    .message-entry .status {
      font-size: 12px;
      margin-top: 4px;
      margin-left: -30px;
    }

    .message-entry .file-status {
      color: green;
    }

    .message-entry.outgoing .message-wrapper {
      margin-left: 20%;
      margin-right: 0;
      display: flex;
      max-width: 80%;
    }

    .message-entry.incoming .message-wrapper {
      max-width: 80%;
      display: flex;
    }

    .message-entry.selected {
      background: #3c4d6abd;
    }

    .message-entry.outgoing md-menu {
      margin-left: -60px;
    }

    .message-entry.incoming md-menu {
      margin-left: -55px;
    }

    .message-wrapper md-menu {
      margin-top: 10px;
      font-weight: 800;
    }

    // .outgoing {
    //   align-self: flex-end;
    // }
    .message-entry.ng-enter, .message-entry.ng-leave {
      -webkit-transition: 0.5s linear all;
      transition: 0.5s linear all;
    }
    .message-entry.ng-enter, .message-entry.ng-leave.ng-leave-active {
      opacity: 0;
      height: 0px;
    }
    .message-entry.ng-leave, .message-entry.ng-enter.ng-enter-active {
      opacity: 1;
      height: 40px;
    }
  `],
  template: `

<div class="messages" ui-scroll-viewport layout="column" flex scroll-glue>

<div ui-scroll="item in vm.datasource" buffer-size="20" start-index="10" adapter="adapter"
      layout="row" class="message-entry" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing, selected: item.selected}">
<div class="message-wrapper">
    <md-icon ng-class="{transportserver: item.transport=='server'}" md-font-library="material-icons">{{item.outgoing ? 'chat_bubble_outline' : 'comment'}}</md-icon>
    <md-icon class="status" md-font-library="material-icons" ng-class="{transportserver: item.transport=='server'}"
            ng-if="item.stage==1">check</md-icon>
    <md-menu>
      <md-button aria-label="Message menu" class="md-icon-button menu-button" ng-click="vm.openMenu($mdMenu, $event)">
        <!--<md-icon md-menu-origin md-svg-icon="call:phone"></md-icon>-->
        ...
      </md-button>
      <md-menu-content width="4">
        <md-menu-item>
          <md-button ng-click="vm.removeMessage($event, item)">
            Remove
          </md-button>
        </md-menu-item>
      </md-menu-content>
    </md-menu>
    <div layout="column" class="message">
      <div class="header">
        <b ng-if="!item.outgoing">{{item.senderAccount}}&nbsp;&nbsp;&nbsp;&nbsp;</b>{{::item.dateFormatted}}
      </div>
      <div class="message-content">{{item.content}}</div>
      <div ng-if="item.status.fileIndicator == 1 || item.status.fileIndicator == 4">
          <a class="md-primary md-button md-ink-ripple" ng-click="vm.downloadFile(item)">download</a>
      </div>
      <div ng-if="item.status.fileIndicator == 2" class="file-status">File is downloaded</div>
      <div ng-if="item.status.fileIndicator == 3" class="file-status">downloading <elipses-loading></elipses-loading></div>
      <div ng-if="item.status.fileIndicator == 4" class="file-status">file download error</div>
    </div>
</div>
</div>

</div>
  `
})
@Inject('$rootScope', '$scope', '$q', '$timeout', '$document', 'heat', 'user', 'settings',
  'render', 'controlCharRender', 'P2PMessaging', '$mdToast')
class P2PMessagesViewerComponent {

  private publickey: string; // @input
  private containerId: string; // @input
  private dateFormat;
  datasource: P2PMessagesDataSource;
  private room: p2p.Room;
  private items: p2p.MessageHistoryItem[] = []

  constructor(private $rootScope: angular.IRootScopeService,
              private $scope: any,
              $q: angular.IQService,
              $timeout: angular.ITimeoutService,
              private $document: angular.IDocumentService,
              private heat: HeatService,
              private user: UserService,
              private settings: SettingsService,
              private render: RenderService,
              private controlCharRender: ControlCharRenderService,
              private p2pMessaging: P2PMessaging,
              private $mdToast: angular.material.IToastService) {
  }

  $onInit() {
    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT)

    if (this.publickey == '0' || this.publickey == this.user.publicKey) {
      this.publickey = '0'
      return
    }

    let r = this.room = this.p2pMessaging.getOneToOneRoom(this.publickey, true)

    if (!r) return

    this.datasource = new P2PMessagesDataSource(r.key, r.getMessageHistory(), item => this.processItem(item));

    // scroll to the end of list
    db.getMessagesCount(this.user.account, this.room.key).then(c => {
      if (c && this.$scope.adapter) this.$scope.adapter.reload(c)
    })

    r.onNewMessageHistoryItem = (item: p2p.MessageHistoryItem) => {
      this.datasource.first++
      let adapter = this.$scope.adapter
      adapter.append([this.processItem(item)])
    }

    this.$rootScope.$on('OFFCHAIN_MESSAGE_EXTRA_INFO', (event, msgId: string, messageStatus: p2p.MessageStatus) => {
      this.items.forEach(item => {
        if (item.msgId == msgId) {
          this.$scope.$evalAsync(() => {
            item.status = messageStatus
            this.processItem(item)
          })
        }
      })
    })

    this.$scope.$on('$destroy', () => {
      r.onNewMessageHistoryItem = null
    })
  }

  openMenu($mdMenu, event) {
    $mdMenu.open(event);
  }

  removeMessage(event, item: p2p.MessageHistoryItem) {
    let displayDialog = (message: boolean, file: boolean) => {
      let ss = ["local message"]
      if (message) ss.push("message on server")
      if (file) ss.push("file on server")
      item.selected = true
      dialogs.confirm(
        "Remove message",
        "Objects to be removed: " + ss.join(", ") + " <br/><br/> Do you want to remove the message ?"
      ).then(() => {
        return this.datasource.remove(item)
      }).then(() => {
        this.p2pMessaging.checkToRemoveServerMessage(item.type, item["outgoing"], item.transport, item.msgId, item.status)
        // @ts-ignore
        let adapter = this.$scope.adapter
        adapter.applyUpdates(function (item2) {
          if (item2 == item) {
            return []
          }
        });
      }).catch(reason => {
        if (reason) console.error(reason)
      }).finally(() => item.selected = false)
    }

    this.p2pMessaging.requestIsMessageExists(
      item.type, item["outgoing"], item.transport, item.msgId, item.status,
      (message: boolean, file: boolean) => {
        displayDialog(message, file)
        displayDialog = null
      }
    )

    //if will no response on requestIsMessageExists the dialog is displayed in any case
    setTimeout(() => {
      if (displayDialog) displayDialog(null, null)
    }, 2000)
  }

  private processItem(item: p2p.MessageHistoryItem) {
    this.items.push(item)
    item['senderAccount'] = heat.crypto.getAccountIdFromPublicKey(item.fromPeer);
    item['outgoing'] = this.user.account == item['senderAccount'];
    item['dateFormatted'] = dateFormat(item.timestamp, this.dateFormat);
    item['fileIndicator'] = 0  // 0 - it is not "incoming file" message; 1 - file is not downloaded; 2 - file is downloaded
    item['stage'] = item.status?.stage

    if (item.type == "file") {
      if (!item['fileDescriptor']) {
        let s: string = item.content
        let delimiterPos = s?.indexOf("|")
        if (delimiterPos > 0) {
          item['fileDescriptor'] = {
            fileName: s.substring(delimiterPos + 1).trim(),
            fileSize: parseInt(s.substring(0, delimiterPos)),
            fileSender: item.fromPeer
          }
        }
      }
      let fileDescriptor = item['fileDescriptor']
      if (fileDescriptor) {
        if (item['outgoing']) {
          item.content = `Sent file "${fileDescriptor.fileName}" (${fileDescriptor.fileSize} bytes)`
        } else {
          item.content = `file "${fileDescriptor.fileName}", size ${fileDescriptor.fileSize} bytes`
          //link to file
          item['fileIndicator'] = item.status?.fileIndicator || 1
        }
      }
    }

    return item;
  }

  //download message's file
  downloadFile(item) {
    //this.messaging.u2uProtocol.requestFile(this.message.msgId, this.message.fromPeer, this.fileDescriptor)
    item.fileIndicator = 3
    this.heat.api.downloadFile(item.msgId).then(encryptedFileContent => {
      item.fileIndicator = 1
      this.p2pMessaging.onFile(
        encryptedFileContent, this.room, item.msgId, item.fileDescriptor, () => item.fileIndicator = 2
      )
    }).catch(reason => {
      this.$mdToast.show(this.$mdToast.simple().textContent(`Error on file downloading`).hideDelay(6000))
      console.error(reason)
      item.fileIndicator = 4
      return this.room.getMessageHistory().updateMessageStatus(item.msgId, {'status.fileIndicator': 4, 'status.stage': 0})
    })
  }

}

class P2PMessagesDataSource {
  data = []
  first = 1  //index pointed to the head of datasource's list of items. Increased on adding item.

  constructor(private roomKey: string,
              private messageHistory: p2p.MessageHistory,
              private processItem: (item: p2p.MessageHistoryItem) => {}) {
  }

  get(index: number, count: number, success) {
    let offset = Math.max(0, index)
    let limit = index < 0 ? count + index : count
    if (limit == 0) success([])

    this.messageHistory.getMessagesScrollable(this.roomKey, offset, limit)
        .then((items: []) => {
          // console.log(index, count, ' | ', offset, limit, ' | ', items.length)
          success(items.map(v => this.processItem(v)))
        })
  }

  remove(item: p2p.MessageHistoryItem) {
    return this.messageHistory.remove(item.msgId)
  }

}
