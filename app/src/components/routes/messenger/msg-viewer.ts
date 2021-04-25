const PAGE_LENGTH = 2

@Component({
  selector: 'msgViewer',
  inputs: ['publickey', '@containerId'],
  styles: [`
    .msg-entry-menu-disabled {
      opacity: 20%;
    }
    .entry-menu {
      place-content: center;
    }
  `],
  template: `
    <div>
      <div class="row" class="progress-indicator" flex ng-show="vm.loading">
        <md-progress-linear class="md-primary" md-mode="indeterminate"></md-progress-linear>
      </div>
      <div layout="column" flex>
        <div class="scroll-up" layout="row" flex ng-hide="vm.loading || vm.displayMessages.messages.length === vm.messagesCount" layout-align="center">
          <md-button ng-click="vm.scrollUp()" aria-label="Go up">Go up</md-button>
        </div>
        <div layout="column">
          <div layout="row" flex layout-fill ng-repeat="message in vm.displayMessages.messages track by $index">
            <div layout="column" flex>
              <message-batch-entry id="{{::message.__id}}" message="message" room="vm.room" flex="none" class="message-item"></message-batch-entry>
            </div>
            <div layout="column" class="entry-menu">
              <md-menu ng-class="{'msg-entry-menu-disabled': message.onchain || message.transport == 'chain'}">
                <md-button ng-disabled="message.onchain || message.transport == 'chain'" aria-label="Message menu" class="md-icon-button menu-button" ng-click="vm.openMenu($mdMenu, $event)">
                  <!--<md-icon md-menu-origin md-svg-icon="call:phone"></md-icon>-->
                  ...
                </md-button>
                <md-menu-content width="4">
                  <md-menu-item>
                    <md-button ng-click="vm.removeOffchainMessage($event, message)">
                      Remove
                    </md-button>
                  </md-menu-item>
                </md-menu-content>
              </md-menu>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('heat', 'user', '$scope', 'P2PMessaging', 'settings', '$timeout', 'storage', '$mdToast', '$router')
class MsgViewerComponent {
  public room: p2p.Room;
  private publickey: string; //input
  private allMessages;
  private onchainMessagesCount;
  private dateFormat;
  private messageHistory: p2p.MessageHistory;
  private displayMessages;
  private offchainPages: number;
  private scrollElement;
  private loading: boolean;
  private static count: number;
  private containerId;
  private messagesCount: number;
  private store: Store;

  constructor(private heat: HeatService,
              private user: UserService,
              private $scope: angular.IScope,
              private p2pMessaging: P2PMessaging,
              private settings: SettingsService,
              private $timeout: angular.ITimeoutService,
              private storage: StorageService,
              private $mdToast: angular.material.IToastService,
              private router) {
  }

  $onInit() {
    if (this.publickey == this.user.publicKey) {
      throw Error("Same public key as logged in user");
    }
    this.store = this.storage.namespace('contacts.latestTimestamp', this.$scope);
    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    let refresh = utils.debounce((angular.bind(this, this.onMessageAdded)), 500, false);
    this.heat.subscriber.message({sender: this.user.account}, refresh, this.$scope);
    this.heat.subscriber.message({recipient: this.user.account}, refresh, this.$scope);
    MsgViewerComponent.count = 10000;
    this.room = this.p2pMessaging.getOneToOneRoom(this.publickey, true);
    this.initMessages()
  }

  private initMessages() {
    this.offchainPages = 0;
    this.onchainMessagesCount = 0;
    this.messagesCount = 0;
    this.displayMessages = {index: 0, messages: []};
    this.allMessages = [];

    this.heat.api.getMessagingContactMessagesCount(this.user.account, heat.crypto.getAccountIdFromPublicKey(this.publickey))
      .then(count => {
        if (count > 0) {
          this.onchainMessagesCount = count;
          this.messagesCount += count;
        }
      })
      .catch(reason => console.error('Error on getting contact messages count: ' + reason))
      .then(value => {
        if (this.room) {
          this.p2pMessaging.updateSeenTime(this.room.name, Date.now() + 1000 * 60 * 60 * 24);
          this.messageHistory = this.room.getMessageHistory()
          this.offchainPages = this.messageHistory.getPageCount() - 1;
          this.room.onNewMessageHistoryItem = (item: p2p.MessageHistoryItem) => {
            this.onMessageAdded(item, true)
          }
          this.messagesCount += this.messageHistory.getItemCount();
          this.$scope.$on('$destroy', () => {
            this.p2pMessaging.updateSeenTime(this.room.name, Date.now());
            this.room.onNewMessageHistoryItem = null;
          });
        }
        this.loadMessages();
      })
  }

  /*private loadMessages() {
    let promises: Promise<any>[] = [];
    let to = this.onchainMessagesCount;
    let from = this.onchainMessagesCount - PAGE_LENGTH > 0 ? this.onchainMessagesCount - PAGE_LENGTH : 0;
    promises.push(this.loadOnchainMessages(from, to));
    promises.push(this.loadOffchainMessages());
    // can improvise sorting --> currently sorting the already sorted elements too
    Promise.all(promises).then((messages) => {
      this.allMessages = this.allMessages.concat(...messages)
      this.allMessages.sort((a, b) => b.sortingTimestamp - a.sortingTimestamp);
      this.displayMessages.messages = this.displayMessages.messages.concat(
        this.allMessages.slice(this.displayMessages.index, this.displayMessages.index + PAGE_LENGTH)
      )
      this.$scope.$evalAsync(() => { // ensure contents are rendered
        this.$timeout(0).then(() => { // resolve promise in next event loop
            let m = this.displayMessages.messages[this.displayMessages.index];
            if (m) {
              this.displayMessages.index = this.displayMessages.index + PAGE_LENGTH <= this.messagesCount
                ? this.displayMessages.index + PAGE_LENGTH
                : this.messagesCount;
              this.scrollElement = document.getElementById(m.__id);
              if (this.scrollElement) {
                this.getScrollContainer().duScrollToElement(angular.element(this.scrollElement), 0, 1200, heat.easing.easeOutCubic);
              }
            }
          },
          reason => console.log(reason));
      })
    })
  }*/

  range = [0, PAGE_LENGTH]

  private loadMessages() {
    let messagesA = []
    if (this.offchainPages >= 0) {
      messagesA = this.messageHistory.getItems(--this.offchainPages);
    }
    messagesA.forEach(item => this.processOffchainItem(item));
    let timestampes = messagesA.map(m => m.timestamp)
    let minTimestamp = timestampes.length > 0 ? Math.min(...timestampes) : 0
    let maxTimestamp = timestampes.length > 0 ? Math.max(...timestampes) : 0
    if (minTimestamp > 0) {
      this.heat.api.getMessagingContactMessagesByTimestampRange(
        this.user.account, heat.crypto.getAccountIdFromPublicKey(this.publickey), minTimestamp, maxTimestamp).then(messagesB => {
        this.$scope.$evalAsync(() => {
          this.range[0] += messagesB.length
          this.range[1] += messagesB.length
          let processedMessagesB = []
          messagesB.forEach(message => processedMessagesB.push(this.processOnchainItem(message)));
          this.displayMessages.messages = this.displayMessages.messages
            .concat(messagesA, processedMessagesB)
            .sort((a, b) => a.sortingTimestamp - b.sortingTimestamp)
          this.displayMessages.index = this.displayMessages.messages.length

          let joinedContent = this.displayMessages.messages.map(item => item.content?.substr(0, 10)).join(" | ")
          console.debug(`loadOffchainMessages ${this.displayMessages.messages.length}  offchainPages ${this.offchainPages} joinedContent ${joinedContent}`)

        })
      })
    } else {
      this.loadOnchainMessages(this.range[0], this.range[1]).then(messagesB => {
        this.$scope.$evalAsync(() => {
          this.displayMessages.messages = this.displayMessages.messages
            .concat(messagesA, messagesB)
            .sort((a, b) => a.sortingTimestamp - b.sortingTimestamp)
          this.displayMessages.index = this.displayMessages.messages.length

          let joinedContent = this.displayMessages.messages.map(item => item.content?.substr(0, 10)).join(" | ")
          console.debug(`loadOffchainMessages ${this.displayMessages.messages.length}  offchainPages ${this.offchainPages} joinedContent ${joinedContent}`)

        })
      })
      this.range[0] += PAGE_LENGTH
      this.range[1] += PAGE_LENGTH
    }
  }

  private loadOnchainMessages(from: number, to: number) {
    return new Promise((resolve, reject) => {
      let onchainMessages = [];
      if (from < 0 || to < 0)
        resolve(onchainMessages)
      else {
        this.heat.api.getMessagingContactMessages(this.user.account, heat.crypto.getAccountIdFromPublicKey(this.publickey), from, to).then(messages => {
          messages.forEach(message => onchainMessages.push(this.processOnchainItem(message)));
          resolve(onchainMessages)
        }).catch(() => resolve(onchainMessages));
      }
    })
  }

  private loadOffchainMessages(): Promise<Array<p2p.MessageHistoryItem>> {
    return new Promise((resolve, reject) => {
      if (this.messageHistory && this.offchainPages >= 0) {
        let page = this.messageHistory.getItems(this.offchainPages);
        if (page.length < PAGE_LENGTH && this.offchainPages > 0) {
          page = page.concat(this.messageHistory.getItems(--this.offchainPages))
        }
        page.forEach(item => this.processOffchainItem(item));

        let joinedContent = page.map(item => item.content).join(" | ")
        console.debug(`loadOffchainMessages ${page.length}  offchainPages ${this.offchainPages} joinedContent ${joinedContent}`)

        resolve(page)
      } else {
        resolve([])
      }
    });
  }

  private processOnchainItem(message) {
    this.updateLatestMessageReadTimestamp(message);
    let date = utils.timestampToDate(message.timestamp)
    return {
      'senderPublicKey': message.senderPublicKey,
      'senderAccount': heat.crypto.getAccountIdFromPublicKey(message.senderPublicKey),
      'contents': this.heat.getHeatMessageContents(message),
      'date': dateFormat(date, this.dateFormat),
      'outgoing': this.user.account == message.sender,
      'transport': 'chain',
      'timestamp': message.timestamp,
      'sortingTimestamp': date.getTime(),
      '__id': ++MsgViewerComponent.count
    }
  }

  private processOffchainItem(item: p2p.MessageHistoryItem) {
    if (item['__id']) return item //already was processed
    item['__id'] = ++MsgViewerComponent.count;
    item['senderPublicKey'] = item.fromPeer;
    item['senderAccount'] = heat.crypto.getAccountIdFromPublicKey(item.fromPeer);
    item['timestamp'] = item.timestamp;
    item['sortingTimestamp'] = item.receiptTimestamp || item.timestamp;
    item['outgoing'] = this.user.account == item['senderAccount'];
    item['date'] = dateFormat(item.timestamp, this.dateFormat);
    item.transport = item.transport || (item['onchain'] ? 'chain' : 'p2p');
    item['contents'] = item['content'] || item['message'];
    return item;
  }

  private onMessageAdded(data, offchain = false) {
    let newMessage;
    if (offchain) {
      newMessage = this.processOffchainItem(data);
    } else {
      newMessage = this.processOnchainItem(data);
      if (!newMessage['outgoing']) {
        this.$mdToast.show(
          this.$mdToast.simple().textContent(`New message from ${newMessage['senderAccount']}: "${newMessage['contents']}"`).hideDelay(6000)
        );
      }
    }
    //display new message if it is incoming or selected contact is the sender
    if (newMessage['outgoing'] || this.publickey == newMessage.senderPublicKey) {
      this.displayMessages.messages.splice(0, 0, newMessage);
      this.displayMessages.index++;
      this.messagesCount++;
      this.$scope.$evalAsync(() => { // ensure contents are rendered
        this.$timeout(0).then(() => {
          this.scrollElement = document.getElementById(newMessage.__id);
          if (this.scrollElement) {
            this.getScrollContainer().duScrollToElement(angular.element(this.scrollElement), 0, 1200, heat.easing.easeOutCubic);
          }
        })
      })
    }
  }

  private scrollUp() {
    //--this.offchainPages;
    this.onchainMessagesCount -= PAGE_LENGTH + 1;
    this.loadMessages();
  }

  public openMenu($mdMenu, event) {
    $mdMenu.open(event);
  }

  public removeOffchainMessage($event: any, item: p2p.MessageHistoryItem) {
    dialogs.confirm(
      "Remove message",
      "Do you want to remove this message (from yourself only)?"
    ).then(() => {
      this.messageHistory.remove(item.timestamp)
      this.displayMessages.messages = this.displayMessages.messages.filter(i => i.timestamp != item.timestamp);
      this.displayMessages.index--;
      this.allMessages = this.allMessages.filter(i => i.timestamp != item.timestamp);
    }).then(() => {
      this.initMessages()  //stupid way to refresh messages after removing
    })
  }

  getScrollContainer(): duScroll.IDocumentService {
    return <duScroll.IDocumentService>angular.element(document.getElementById(this.containerId))
  }

  updateLatestMessageReadTimestamp(message: IHeatMessage) {
    var account = this.user.account == message.sender ? message.recipient : message.sender;
    var latestTimestamp = this.store.getNumber(account, 0);
    if (message.timestamp > latestTimestamp) {
      this.store.put(account, message.timestamp);
    }
  }

}
