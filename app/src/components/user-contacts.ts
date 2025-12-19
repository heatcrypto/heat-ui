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
    .new-incoming-contact {
      color: lightblue !important;
      font-size: smaller;
      margin-right: 5px;
    }
    .contact-control {
      color: lightblue !important;
      font-size: smaller;
      cursor: pointer;
      margin-left: 5px;
      text-decoration: underline;
    }
    .unread-symbol {
      font-size: 22px;
      color: #ff3301;
      margin: 0 6px -6px 0;
    }
    .p2p-unread-symbol {
      font-size: 22px;
      color: green;
      margin: 0 6px -6px 0;
    }
    @keyframes blinker {
      80% {opacity: 0.5;}
    }
    .channelopened-status-symbol {
      font-size: 22px;
      color: green;
      margin: 0 6px 4px 0;
    }
    .roomregistered-status-symbol {
      font-size: 22px;
      color: skyblue;
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
          <span ng-if="contact.unreadStatus > 1" class="p2p-unread-symbol">*</span>
          <span ng-if="vm.p2pMessaging.contactStatus(contact.publicKey)=='channelOpened'" class="channelopened-status-symbol">●</span>
          <span ng-if="vm.p2pMessaging.contactStatus(contact.publicKey)=='roomRegistered' && vm.p2pMessaging.onlineStatus == 'online'"
                class="roomregistered-status-symbol">●</span>
          <span ng-if="contact.newIncomingContact" class="new-incoming-contact">new</span>
          <div class="account-col left">
            <a href="#/messenger/{{contact.publicKey}}" ng-class="{'active':contact.publicKey==vm.activePublicKey}">{{contact.publicName || contact.account}}</a>
          </div>

          <a class="contact-control" ng-if="contact.newIncomingContact" ng-click="vm.acceptNewContact(contact)">Accept</a>
<!--          <a class="contact-control" ng-if="contact.newIncomingContact && contact.isP2POnlyContact" ng-click="vm.remove(contact)">Remove</a>-->
          <a class="contact-control" ng-if="contact.isP2POnlyContact" ng-click="vm.remove(contact)">Remove</a>
        </md-list-item>
      </md-list>

      <md-menu class="right" style="margin-left: -40px; margin-bottom: -10px"
            ng-if="vm.p2pMessaging.onlineStatus == 'online'">
        <md-button aria-label="Contact menu" ng-click="$mdMenu.open($event)">
          <i><img style="width: 15px" src="assets/sandwich.png"></i>
          <md-tooltip md-direction="top">Contact Control</md-tooltip>
        </md-button>
        <md-menu-content width="1">
          <div style="height: 9px;color: black;margin: 3px 5px 14px 5px;font-weight: bold;">
              Contact "{{vm.getActiveContact().publicName || vm.getActiveContact().account}}"
          </div>
          <md-menu-item>
            <md-button ng-click="vm.purgeMessages(vm.getActiveContact())">
              Purge messages
            </md-button>
          </md-menu-item>
          <md-menu-item>
            <md-button ng-click="vm.purgeAllMessages()">
              Purge messages of all contacts
            </md-button>
          </md-menu-item>
        </md-menu-content>
      </md-menu>

    </div>
  `
})

@Inject('$scope','user','heat','$q','$interval','$timeout','$location','$rootScope', 'P2PMessaging', '$mdToast', 'contactService')
class UserContactsComponent {

  public contacts : Array<IHeatMessageContact> = [];
  private refresh: IEventListenerFunction;
  private activePublicKey: string;
  private needRefreshed = false

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private heat: HeatService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private $interval: angular.IIntervalService,
              private $location: angular.ILocationService,
              private $rootScope: angular.IRootScopeService,
              public p2pMessaging: P2PMessaging,
              private $mdToast: angular.material.IToastService,
              private contactService: ContactService) {

    this.refresh = utils.debounce(() => this.refreshContacts(), 1000);
    heat.subscriber.unconfirmedTransaction({recipient: this.user.account}, ()=>{
      this.needRefreshed = true
      this.refresh()
    })

    let interval = $interval(() => {
      if (this.needRefreshed) {
        this.needRefreshed = false
        this.refresh()
      } /*else {
        //light refresh
        for (const c of this.contacts) {
          c['hasUnreadMessage'] = !c.isP2POnlyContact && contactService.contactHasUnreadMessage(c)
        }
      }*/
    }, 4 * 1000)

    $scope.$on('$destroy', () => $interval.cancel(interval))

    let updateSeenTimeListener: IEventListenerFunction = () => this.needRefreshed = true
    this.p2pMessaging.on(P2PMessaging.EVENT_UPDATE_SEEN_TIME, updateSeenTimeListener)

    let contactListener: IEventListenerFunction = contactPublicKey => {
      db.getContact(this.user.account, contactPublicKey).then((contact: IHeatMessageContact) => {
        if (contact && contact.activityTimestamp) {
          if (contact.activityTimestamp < 0) {
            contact.activityTimestamp = -contact.activityTimestamp
            this.$location.path(`/messenger/${contact.publicKey}`)
          }
          this.refresh()
        }
      })
    }
    this.contactService.on(ContactService.SAVE_CONTACT, contactListener)

    if (user.unlocked) {
      this.init()
    } else {
      let listener = () => {
        this.init()
      }
      user.on(UserService.EVENT_UNLOCKED, listener)
      $scope.$on('$destroy', () => user.removeListener(UserService.EVENT_UNLOCKED, listener))
    }

    this.updateActivePublicKey()

    //let myRoom = this.p2pMessaging.register();

    let messageListener = (msg: p2p.U2UMessage, room: p2p.Room) => {
      for (let contact of this.contacts) {
        if (contact.unreadStatus > 0) continue //1 or saved timestamp (both are > 0) not needed to be updated
        if (msg.fromPeerId == contact.publicKey) {
          p2pMessaging.unreadStatusAccessor.getUnreadStatus(contact.publicKey).then(status => contact.unreadStatus = status)
        }
      }
    }
    this.p2pMessaging.on(P2PMessaging.EVENT_NEW_MESSAGE, messageListener)

    let channelListener: IEventListenerFunction = (room: p2p.Room, peerId: string) => {
      this.refresh();
    };
    this.p2pMessaging.on(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, channelListener);
    this.p2pMessaging.on(P2PMessaging.EVENT_ON_CLOSE_DATA_CHANNEL, channelListener);

    $scope.$on('$destroy', () => {
      this.p2pMessaging.removeListener(P2PMessaging.EVENT_NEW_MESSAGE, messageListener)
      this.p2pMessaging.removeListener(P2PMessaging.EVENT_UPDATE_SEEN_TIME, updateSeenTimeListener)
      this.contactService.removeListener(ContactService.SAVE_CONTACT, contactListener)
      this.p2pMessaging.removeListener(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, channelListener)
      this.p2pMessaging.removeListener(P2PMessaging.EVENT_ON_CLOSE_DATA_CHANNEL, channelListener)

      ContactService.contactsActive = false // now all contacts accept unread status
    })

    this.fetchCryptoAddresses('BTC')
  }

  acceptNewContact(contact: IHeatMessageContact) {
    delete contact.newIncomingContact
    this.contactService.saveContact(contact.publicKey, contact.publicName, null, null, contact)
  }

  remove(contact: IHeatMessageContact) {
    dialogs.confirm(
      `Remove contact ${contact.publicName || contact.privateName || contact.account}`,
      `Do you want to remove the contact ${contact.publicName || contact.privateName || contact.account}`
    ).then(() => {
      this.$scope.$evalAsync(() => {
        let pr = this.getPeerAndRoom(contact)
        if (pr.peer) pr.peer.closeConnection()
        if (pr.room) pr.room.getMessageHistory().clear(pr.room.key)
        db.removeContact(this.user.account, contact.publicName)
            .then(() => this.refreshContacts())
            .then(() => this.updateActivePublicKey(true))
      })
    })
  }

  purgeMessages(contact: IHeatMessageContact) {
    if (!contact) {
      this.$mdToast.show(
          this.$mdToast.simple().textContent("Select contact first please").hideDelay(5000)
      )
      return
    }
    dialogs.confirm(
      `Contact ${contact.publicName || contact.privateName || contact.account}`,
      `Do you want to purge the contact's messages in local storage?`
    ).then(() => {
      this.$scope.$evalAsync(() => {
        this.purgeMessagesInternal(contact)
        this.refreshMessageHistory()
      })
    })
  }

  /**
   * Purge messages in local storage of all contacts
   */
  purgeAllMessages() {
    dialogs.confirm(
      "Purge all messages of all contacts of current user " + this.user.accountName,
      "Do you want to purge all messages in local storage?"
    ).then(() => {
      let p: Promise<any>[] = []
      this.contacts.forEach(contact => {
        p.push(this.purgeMessagesInternal(contact))
      })
      Promise.all(p).then(() => {
        this.$scope.$evalAsync(() => {
          this.refreshMessageHistory()
        })
      })
    })
  }

  private purgeMessagesInternal(contact: IHeatMessageContact) {
    let pr = this.getPeerAndRoom(contact)
    if (pr.room) {
      return db.getMessages(this.user.account, pr.room.key).then(m => {
        this.p2pMessaging.checkToRemoveServerMessage(m.type, m["outgoing"], m.transport, m.msgId, m.status)
      }).then(() => db.removeMessages(this.user.account, pr.room.key))
    }
    return Promise.resolve()
  }

  getActivePublicKeyParam() {
    let path = this.$location.path().replace(/^\//,'').split('/'), route = path[0], params = path.slice(1)
    var result = (route == "messenger") ? params[0] : null
    return result == "0" ? null : result
  }

  updateActivePublicKey(reset?: boolean) {
    if (reset) this.$location.path("/messenger/0");

    this.activePublicKey = this.getActivePublicKeyParam();

    if (this.activePublicKey) {
      this.user["activeMessengerContact"] = this.activePublicKey
    } else {
      this.activePublicKey = this.user["activeMessengerContact"]
      if (this.activePublicKey) {
        this.$location.path(`/messenger/${this.activePublicKey}`)
      }
    }

    if (this.activePublicKey && this.activePublicKey != "0") {
      let room = this.p2pMessaging.enterRoom(this.activePublicKey)
      if (room) {
      }
    }

    setTimeout(() => this.updateUnreadStatuses(), 200)
    ContactService.contactsActive = true

    if (!this.activePublicKey || this.activePublicKey == "0") {
      if (this.contacts[0] && this.contacts[0].publicKey != "0") {
        this.$location.path(`/messenger/${this.contacts[0].publicKey}`)
      }
    }
  }

  getActiveContact() {
    return this.contacts.find(contact => contact.publicKey == this.activePublicKey);
  }

  updateUnreadStatuses() {
    let activeContact
      activeContact = this.contacts.find(contact => contact.publicKey == this.activePublicKey)
      if (activeContact) {
        activeContact.unreadStatus = 1
        this.p2pMessaging.unreadStatusAccessor.putUnreadStatus(activeContact.publicKey, 1)
      }
    for (const c of this.contacts) {
      if (c.unreadStatus == 1 && c.publicKey != activeContact?.publicKey) {
        this.p2pMessaging.unreadStatusAccessor.putUnreadStatus(c.publicKey, 0)
        c.unreadStatus = 0
      }
    }
  }

  init() {
    setTimeout(() => this.refreshContacts(), 100)
  }

  refreshContacts() {
    return this.contactService.getContacts(this.activePublicKey).then(contacts => {
      this.contacts = contacts
      if (this.getActivePublicKeyParam() == "0") this.updateActivePublicKey()

      // fill contacts unreadStatuses
      for (let contact of this.contacts) {
        this.p2pMessaging.unreadStatusAccessor.getUnreadStatus(contact.publicKey).then(status => {
          if (status == 1 && contact.publicKey != this.activePublicKey) {
            this.p2pMessaging.unreadStatusAccessor.putUnreadStatus(contact.publicKey, 0)
          }
          contact.unreadStatus = status == 1 ? 0 : status
        })
      }
    })
  }

  refreshMessageHistory() {
    let contact = this.getActiveContact()
    this.$location.path("/messenger/0")
    setTimeout(() => {
      this.$location.path(`/messenger/${contact.publicKey}`)
    }, 200)
  }

  getPeerAndRoom(contact: IHeatMessageContact) {
    if (!contact.publicKey) return {}
    let room = this.p2pMessaging.getOneToOneRoom(contact.publicKey)
    return room ? {room: room, peer: room.getPeer(contact.publicKey)} : {}
  }

  fetchCryptoAddresses(currency: string) {
    db.listContacts(this.user.account).then((contacts: any[]) => {
      for (const contact of contacts) {
        //console.log(`fetching ${currency} of p2p contact: ${contact.account}`)
        this.contactService.fetchCryptoAddress(contact, currency)
      }
    })
  }

}
