@Component({
  selector: 'msgViewer',
  inputs: ['publickey', '@containerId'],
  template: `
    <div>
      <div class="row" class="progress-indicator" flex ng-show="vm.loading">
        <md-progress-linear class="md-primary" md-mode="indeterminate"></md-progress-linear>
      </div>
      <div layout="column" flex>
        <div class="scroll-up" layout="row" flex ng-hide="vm.loading || vm.displayMessages.messages.length === vm.allMessages.length" layout-align="center">
          <md-button ng-click="vm.scrollUp()" aria-label="Go up">Go up</md-button>
        </div>
        <div layout="column">
          <div layout="column" ng-repeat="message in vm.displayMessages.messages | orderBy:'date'">
            <message-batch-entry id="{{::message.__id}}" message="message" flex="none" class="message-item"></message-batch-entry>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('heat', 'user', '$scope', 'P2PMessaging', 'settings', '$anchorScroll', '$location', '$timeout')
class MsgViewerComponent {
  private publickey: string; //input
  private account: string;
  private allMessages = [];
  private onchainMessagesCount = 0;
  private dateFormat;
  private messageHistory: p2p.MessageHistory;
  private displayMessages = { index: 0, messages: [] };
  private offchainPages: number = 0;
  private scrollElement;
  private loading: boolean;
  private static count: number;
  private containerId;

  constructor(private heat: HeatService,
    private user: UserService,
    private $scope: angular.IScope,
    private p2pMessaging: P2PMessaging,
    private settings: SettingsService,
    private $anchorScroll: angular.IAnchorScrollService,
    private $location: angular.ILocationService,
    private $timeout: angular.ITimeoutService) {
    let publicKey = this.user.key ? this.user.key.publicKey : this.user.publicKey;

    if (this.publickey == publicKey) {
      throw Error("Same public key as logged in user");
    }
    this.dateFormat = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.account = user.key ? user.key.account : user.account;
    var refresh = utils.debounce((angular.bind(this, this.onMessageAdded)), 500, false);
    heat.subscriber.message({ sender: this.account }, refresh, $scope);
    heat.subscriber.message({ recipient: this.account }, refresh, $scope);
    MsgViewerComponent.count = 10000;
    this.initMessages()
  }

  private initMessages() {
    this.heat.api.getMessagingContactMessagesCount(this.account, heat.crypto.getAccountIdFromPublicKey(this.publickey)).then(count => {
      if (count > 0) {
        this.onchainMessagesCount = count;
      }
      let room = this.p2pMessaging.getOneToOneRoom(this.publickey, true);
      if (room) {
        this.messageHistory = room.getMessageHistory()
        this.offchainPages = this.messageHistory.getPageCount() - 1;
        room.onNewMessageHistoryItem = (item: p2p.MessageHistoryItem) => { this.onMessageAdded(item, true) }
      }
      this.loadMessages();
    })
  }

  private loadMessages() {
    let promises: Promise<any>[] = [];
    let to = this.onchainMessagesCount;
    let from = this.onchainMessagesCount - 10 > 0 ? this.onchainMessagesCount : 0;
    promises.push(this.loadOnchainMessages(from, to));
    promises.push(this.loadOffchainMessages());
    // can improvise sorting --> currently sorting the already sorted elements too
    Promise.all(promises).then((messages) => {
      this.allMessages = this.allMessages.concat(...messages)
      this.allMessages.sort((a, b) => (Date.parse(a.date) < Date.parse(b.date)) ? 1 : ((Date.parse(b.date) < Date.parse(a.date)) ? -1 : 0));
      this.displayMessages.messages = this.displayMessages.messages.concat(this.allMessages.slice(this.displayMessages.index, this.displayMessages.index + 10))
      this.scrollElement = this.displayMessages.messages[this.displayMessages.index];

      this.displayMessages.index = this.displayMessages.index + 10;
      angular.element(this.scrollElement).ready(()=>{
        this.getScrollContainer().duScrollToElement(angular.element(this.scrollElement), 0, 1200, heat.easing.easeOutCubic);
      })
    }).then(() => {
      this.$timeout(0).then(() => {

      })
    })
  }

  private loadOnchainMessages(from: number, to: number) {
    return new Promise((resolve, reject) => {
      let onchainMessages = [];
      if (from < 0 || to < 0)
        resolve(onchainMessages)
      else {
        this.heat.api.getMessagingContactMessages(this.account, heat.crypto.getAccountIdFromPublicKey(this.publickey), from, to).then(messages => {
          messages.forEach(message => onchainMessages.push(this.processOnchainItem(message)));
          resolve(onchainMessages)
        }).catch(() => resolve(onchainMessages));
      }
    })
  }

  private loadOffchainMessages() {
    return new Promise((resolve, reject) => {
      if (this.messageHistory && this.offchainPages >= 0) {
        let page = this.messageHistory.getItems(this.offchainPages);
        if (page.length < 10) {
          page = page.concat(this.messageHistory.getItems(--this.offchainPages))
        }
        page.forEach(item => this.processOffchainItem(item));
        resolve(page)
      } else { resolve([]) }
    });
  }

  private processOnchainItem(message) {
    return {
      'content': this.heat.getHeatMessageContents(message),
      'date': dateFormat(utils.timestampToDate(message.timestamp), this.dateFormat),
      'outgoing': this.account === message.sender,
      'onchain': true,
      'timestamp': message.timestamp,
      '__id': ++MsgViewerComponent.count
    }
  }
  private processOffchainItem(item: p2p.MessageHistoryItem) {
    item['senderAccount'] = heat.crypto.getAccountIdFromPublicKey(item.fromPeer);
    item['outgoing'] = this.account == item['senderAccount'];
    item['date'] = dateFormat(item.timestamp, this.dateFormat);
    item['onchain'] = false;
    item['content'] = item['content'] || item['message'];
    item['__id'] = ++MsgViewerComponent.count;
    return item;
  }

  private onMessageAdded(data, isoffchain = false) {
    if (isoffchain)
      this.scrollElement = this.processOffchainItem(data);
    else
      this.scrollElement = this.processOnchainItem(data);

    this.displayMessages.messages.splice(0, 0, this.scrollElement);
    this.displayMessages.index++;
    this.$location.hash(this.scrollElement.__id);
    this.$anchorScroll();
  }

  private scrollUp() {
    --this.offchainPages;
    this.onchainMessagesCount -= 11;
    this.loadMessages();
  }

  getScrollContainer(): duScroll.IDocumentService {
    return <duScroll.IDocumentService>angular.element(document.getElementById(this.containerId))
  }

}
