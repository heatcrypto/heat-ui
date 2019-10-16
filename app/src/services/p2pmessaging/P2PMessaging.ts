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

type OnlineStatus = "online" | "offline";
type EnterRoomState = "not" | "entering" | "entered";

/**
 * This class is bridge between heat-ui components and p2p connector low level components (which intended to be independent of heat-ui).
 * So this service is intended to provide p2p connector to the heat-ui functions.
 */
@Service('P2PMessaging')
@Inject('settings', 'user', 'storage', '$interval', 'heat', '$mdToast')
class P2PMessaging extends EventEmitter implements p2p.P2PMessenger {

  public static EVENT_NEW_MESSAGE = 'EVENT_NEW_MESSAGE';
  public static EVENT_HAS_UNREAD_CHANGED = 'EVENT_HAS_UNREAD_CHANGED';
  public static EVENT_ON_OPEN_DATA_CHANNEL = 'EVENT_ON_OPEN_DATA_CHANNEL';
  public static EVENT_ON_CLOSE_DATA_CHANNEL = 'EVENT_ON_CLOSE_DATA_CHANNEL';

  public p2pContactStore: Store;
  public seenP2PMessageTimestampStore: Store;
  public hasUnreadMessage: boolean = false;

  public connector: p2p.P2PConnector;

  constructor(private settings: SettingsService,
              private user: UserService,
              private storage: StorageService,
              private $interval: angular.IIntervalService,
              private heat: HeatService,
              private $mdToast: angular.material.IToastService) {
    super();

    let closeConnector = () => {
      if (this.connector) {
        this.connector.close(false);
        this.connector = null;
      }
    };

    user.on(UserService.EVENT_UNLOCKED, () => {
      closeConnector();

      this.connector = new p2p.P2PConnector(this, settings, $interval);
      this.connector.setup(
        this.user.publicKey,
        (roomName, peerId: string) => this.createRoomOnIncomingCall(roomName, peerId),
        peerId => this.confirmIncomingCall(peerId),
        reason => this.onSignalingError(reason),
        dataHex => this.sign(dataHex),
        (message, peerPublicKey) => this.encrypt(message, peerPublicKey),
        (message: heat.crypto.IEncryptedMessage, peerPublicKey: string) => this.decrypt(message, peerPublicKey)
      );
    });

    user.on(UserService.EVENT_LOCKED, closeConnector);

    this.p2pContactStore = storage.namespace('p2pContacts');
    this.seenP2PMessageTimestampStore = storage.namespace('contacts.seenP2PMessageTimestamp');
  }

  private encrypt(message: string, peerPublicKey: string) {
    return heat.crypto.encryptMessage(message, peerPublicKey, this.user.secretPhrase, false);
  }

  private decrypt(message: heat.crypto.IEncryptedMessage, peerPublicKey: string) {
    return heat.crypto.decryptMessage(message.data, message.nonce, peerPublicKey, this.user.secretPhrase, false);
  }

  onMessage(msg: {}, room: p2p.Room) {
    this.emit(P2PMessaging.EVENT_NEW_MESSAGE, msg, room);
    this.seenP2PMessageTimestampStore.put(room.name + "_last-message-time", Date.now());
    this.updateSeenTime(null);
    this.displayNewMessagePopup(msg, room);
  }

  private displayNewMessagePopup(msg: any, room: p2p.Room) {
    if (msg.type == "chat" && msg.text) {
      let account = heat.crypto.getAccountIdFromPublicKey(msg.fromPeerId);
      let text: string = msg.text.substring(0, 50);
      if (msg.text.length > 50) {
        let lastSpaceIndex = Math.max(text.lastIndexOf(" "), 30);
        text = text.substring(0, lastSpaceIndex) + " ...";
      }
      this.$mdToast.show(
        this.$mdToast.simple().textContent(`New message from ${account}: "${text}"`).hideDelay(6000)
      );
    } else if(msg.type == "contactUpdate") {
      let parsedMessage = JSON.parse(msg.text);
      let account = heat.crypto.getAccountIdFromPublicKey(msg.fromPeerId);
      let publicKey = msg.fromPeerId
      console.log(msg.text)
      this.heat.api.searchPublicNames(account, 0, 100).then((accounts)=> {
        let expectedAccount = accounts.find(value => value.publicKey == publicKey);
          if (expectedAccount) {
            let contactUtils = <P2pContactUtils>heat.$inject.get('p2pContactUtils');
            contactUtils.updateContactCurrencyAddress(account, parsedMessage.name, parsedMessage.address, publicKey, expectedAccount.publicName, -Date.now())
          }
      })
    }
  }

  set onlineStatus(status: OnlineStatus) {
    this.connector.setOnlineStatus(status);
  }

  get onlineStatus(): OnlineStatus {
    return this.connector.onlineStatus;
  }

  /**
   * Returns room with single peer.
   */
  getOneToOneRoom(peerId: string, required?: boolean): p2p.Room {
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room && required) {
      room = this.setupRoom(new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]));
      this.connector.rooms.set(roomName, room);
    }
    if (room && room.getAllPeers().size <= 1) {
      //todo check is opened channel
      return room;
    }
  }

  sendKeys = (room: p2p.Room, text: string) => {
    room.sendMessage({timestamp: Date.now(), type: "contactUpdate", text});
  }

  /**
   * Creates new room and registers it on the signaling server.
   */
  enterRoom(peerId: string): p2p.Room {
    if (this.onlineStatus == "offline") {
      return null;
    }
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = this.setupRoom(new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]));
      this.connector.rooms.set(roomName, room);
    }
    if (room.state.entered == "not") {
      room.enter();
    }
    return room;
  }

  call(peerId: string): p2p.Room {
    let room = this.enterRoom(peerId);
    this.connector.call(peerId, this.user.publicKey, room);
    return room;
  }

  onSignalingError(reason: string) {
    console.log("Signaling error: " + reason);
  }

  sign(dataHex: string): p2p.ProvingData {
    //proof the passed to room public key is owned
    let signature = heat.crypto.signBytes(dataHex, converters.stringToHexString(this.user.secretPhrase));
    return {signatureHex: signature, dataHex: dataHex, publicKeyHex: this.user.publicKey}
  }

  private setupRoom(room: p2p.Room): p2p.Room {
    room.onOpenDataChannel = peerId => {
      this.emit(P2PMessaging.EVENT_ON_OPEN_DATA_CHANNEL, room, peerId);
    };
    room.onCloseDataChannel = peerId => {
      this.emit(P2PMessaging.EVENT_ON_CLOSE_DATA_CHANNEL, room, peerId);
    };
    room.lastIncomingMessageTimestamp = this.seenP2PMessageTimestampStore.getNumber(room.name + "_last-message-time", 0);
    return room;
  }

  private generateOneToOneRoomName(peerOnePublicKey: string, peerTwoPublicKey: string) {
    let arr = [heat.crypto.getAccountIdFromPublicKey(peerOnePublicKey), heat.crypto.getAccountIdFromPublicKey(peerTwoPublicKey)];
    arr.sort();
    return arr[0] + "-" + arr[1];
  }

  private createRoomOnIncomingCall(roomName: string, peerId: string) {
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = this.setupRoom(new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]));
      this.connector.rooms.set(roomName, room);
    }
    return room;
  }

  private confirmIncomingCall(peerId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      // if peer is connected already confirm silently
      if (this.isPeerConnected(peerId)) {
        resolve();
        return;
      }

      let updateContactCallTime = (account: string, publicKey: string, publicName: string) => {
        //save negative time to force to select contact in contact list
        this.saveContact(peerAccount, peerId, publicName, -Date.now());
      };

      let peerAccount = heat.crypto.getAccountIdFromPublicKey(peerId);
      this.heat.api.searchPublicNames(peerAccount, 0, 100).then(accounts => {
        let expectedAccount = accounts.find(value => value.publicKey == peerId);
        if (expectedAccount) {
          let closeDialogOnConnected = (mdDialog: angular.material.IDialogService) => {
            let interval = this.$interval(() => {
              if (this.isPeerConnected(peerId)) {
                mdDialog.cancel("Already connected");
                this.$interval.cancel(interval);
                updateContactCallTime(peerAccount, peerId, expectedAccount.publicName);
              }
            }, 500, 7, false);
          };
          dialogs.confirm(
            "Incoming connect request",
            `Account &nbsp;&nbsp;<b>${expectedAccount.publicName}</b>&nbsp;&nbsp; wants to connect with you. Accepting connection will share your current IP address. Accept or decline? Click OK to accept, Cancel to decline.`,
            closeDialogOnConnected
          ).then(() => {
            updateContactCallTime(peerAccount, peerId, expectedAccount.publicName);
            resolve();
          });
        } else {
          reject("Account not found");
        }
      });
    });
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, userMessage?: string): p2p.CallDialog {
    return new p2p.CallDialog($event, this.heat, this.user, recipient, recipientPublicKey, this);
  }

  saveContact(account: string, publicKey: string, publicName: string, calledTimestamp?: number) {
    if (!publicKey) return;
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (contact && calledTimestamp && calledTimestamp != contact.activityTimestamp) {
      contact.activityTimestamp = calledTimestamp;
      this.p2pContactStore.put(account, contact);
    }
    if (!contact) {
      contact = {
        account: account,
        privateName: '',
        publicKey: publicKey,
        publicName: publicName,
        timestamp: 0,
        activityTimestamp: calledTimestamp
      };
      this.p2pContactStore.put(account, contact);
    }
  }

  isPeerConnected(peerId: string): boolean {
    let room = this.getOneToOneRoom(peerId);
    if (room) {
      let peer = room.getPeer(peerId);
      return peer && peer.isConnected();
    }
    return false;
  }

  roomHasUnreadMessage(room: p2p.Room): boolean {
    return room.lastIncomingMessageTimestamp > this.seenP2PMessageTimestampStore.getNumber(room.name, 0);
  }

  /**
   * The seen time is needed to display mark for contact when it receives the new unread messages.
   */
  updateSeenTime(roomName: string, timestamp?: number) {
    if (roomName) {
      this.seenP2PMessageTimestampStore.put(roomName, timestamp ? timestamp : Date.now() - 500);
    }

    //update read status on all rooms
    let unreadRooms = [];
    this.connector.rooms.forEach(room => {
      if (this.roomHasUnreadMessage(room)) {
        unreadRooms.push(room);
      }
    });
    let nowHasUnreadMessage = unreadRooms.length > 0;
    if (nowHasUnreadMessage != this.hasUnreadMessage) {
      this.hasUnreadMessage = nowHasUnreadMessage;
      this.emit(P2PMessaging.EVENT_HAS_UNREAD_CHANGED, unreadRooms);
    }
  }

}
