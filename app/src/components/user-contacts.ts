/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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
  selector: 'userContacts',
  styles: [`
    .unread-symbol {
      animation: blinker 2s linear infinite;
      font-size: 22px;
      color: indianred;
      margin: 0 6px -6px 0;
    }
    @keyframes blinker {
      80% {opacity: 0.5;}
    }
    .online-status-symbol {
      font-size: 22px; 
      color: green; 
      margin: 0 6px 4px 0;
    }
  `],
  template: `
    <div layout="column" flex layout-fill>
      <md-list flex layout="column">
        <md-list-item ng-repeat="contact in vm.contacts" aria-label="Entry">
          <!--<div class="truncate-col unread-col left">
            <md-icon md-font-library="material-icons" ng-class="{'has-unread-message': contact.hasUnreadMessage}">fiber_manual_record</md-icon>
          </div>-->
          <span ng-if="contact.hasUnreadMessage" class="unread-symbol">*</span>
          <span ng-if="vm.offchainStatus(contact.publicKey)=='channelOpened'" class="online-status-symbol">●</span>
          <span ng-if="vm.offchainStatus(contact.publicKey)=='roomRegistered'" class="online-status-symbol">○</span>
          <div class="truncate-col account-col left">
            <a href="#/messenger/{{contact.publicKey}}" ng-class="{'active':contact.publicKey==vm.activePublicKey}">{{contact.publicName || contact.account}}</a>
          </div>
        </md-list-item>
      </md-list>
    </div>
  `
})
@Inject('$scope','user','heat','$q','$timeout','$location','$rootScope','storage', 'P2PMessaging')
class UserContactsComponent {

  public contacts : Array<IHeatMessageContact> = [];
  private refresh: IEventListenerFunction;
  private activePublicKey: string;
  private store: Store;
  private rooms: Map<string, Room> = new Map<string, Room>();
  private onlineStatuses: Map<string, string> = new Map<string, string>();

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private heat: HeatService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private $location: angular.ILocationService,
              private $rootScope: angular.IRootScopeService,
              storage: StorageService,
              private p2pMessaging: P2PMessaging) {

    this.refresh = utils.debounce(
      () => {
        this.getContacts()
      },
    500, true);
    heat.subscriber.unconfirmedTransaction({recipient:user.account}, ()=>{ this.refresh() });

    this.store = storage.namespace('contacts.latestTimestamp', $scope);
    this.store.on(Store.EVENT_PUT, this.refresh);

    if (user.unlocked) {
      this.init();
    }
    else {
      let listener = () => { this.init() };
      user.on(UserService.EVENT_UNLOCKED, listener);
      $scope.$on('$destroy',()=>user.removeListener(UserService.EVENT_UNLOCKED, listener));
    }

    $rootScope.$on('$locationChangeSuccess', () => { this.setActivePublicKey() });
    this.setActivePublicKey();

    //let myRoom = this.p2pMessaging.register();
  }

  getActivePublicKey() {
    var path = this.$location.path().replace(/^\//,'').split('/'), route = path[0], params = path.slice(1);
    return (route == "messenger") ? params[0] : null;
  }

  setActivePublicKey() {
    this.activePublicKey = this.getActivePublicKey();

    if (this.activePublicKey && this.activePublicKey != "0") {
      let room = this.p2pMessaging.enterRoom(this.activePublicKey);
      this.rooms.set(this.activePublicKey, room);
      if (!room.onOpenDataChannel) {
        room.onOpenDataChannel = peerId => {
          this.refresh();
        };
        room.onCloseDataChannel = peerId => {
          this.refresh();
        };
      }
    }

    if (!this.activePublicKey || this.activePublicKey == "0") {
      if (this.contacts[0] && this.contacts[0].publicKey != "0") {
        this.$location.path(`/messenger/${this.contacts[0].publicKey}`);
      }
    }
  }

  init() {
    this.getContacts();
    // var topic = new TransactionTopicBuilder().account(this.user.account);
    // var observer = this.engine.socket().observe<TransactionObserver>(topic).
    //   add(this.refresh).
    //   remove(this.refresh).
    //   confirm(this.refresh);
    // this.$scope.$on("$destroy",() => { observer.destroy() });
  }

  getContacts() {
    this.heat.api.getMessagingContacts(this.user.account, 0, 100).then((contacts) => {
      this.$scope.$evalAsync(() => {
        this.contacts = contacts.filter((contact)=> {
          return contact.account != this.user.account;
        }).map((contact) => {
          contact['hasUnreadMessage'] = this.contactHasUnreadMessage(contact);
          return contact;
        });
        if (!this.getActivePublicKey() || this.getActivePublicKey()=="0") {
          this.setActivePublicKey();
        }
      });
    })
  }

  offchainStatus(publicKey: string) {
    let room = this.p2pMessaging.getRoom(publicKey);
    if (room) {
      let peer = room.getPeer(publicKey);
      if (peer && peer.isConnected()) {
        return "channelOpened";
      } else {
        return "roomRegistered";
      }
    }
  }

  contactHasUnreadMessage(contact: IHeatMessageContact): boolean {
    return contact.timestamp > this.store.getNumber(contact.account, 0);
  }

  private confirmIncomingCall(peerId: string): Promise<any> {
    return new Promise<any>((resolve) => {
      //todo get public name instead account
      let peerAccount = heat.crypto.getAccountIdFromPublicKey(peerId);
      dialogs.confirm("Incoming call", `User ${peerAccount} calls you.`).then(() => resolve());
    });
  }

}
