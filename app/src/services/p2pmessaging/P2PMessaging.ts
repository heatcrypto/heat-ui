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

import IEncryptedMessage = heat.crypto.IEncryptedMessage;

type OnlineStatus = "online" | "offline";
type EnterRoomState = "not" | "entering" | "entered";

/**
 * This class is bridge between heat-ui components and p2p connector low level components (which intended to be independent of heat-ui).
 * So this service is intended to provide p2p connector to the heat-ui functions.
 */
@Service('P2PMessaging')
@Inject('settings', 'user', 'storage', '$interval', 'heat', '$mdToast', 'contactService')
class P2PMessaging extends EventEmitter implements p2p.P2PMessenger {

  public static EVENT_NEW_MESSAGE = 'EVENT_NEW_MESSAGE';
  public static EVENT_HAS_UNREAD_CHANGED = 'EVENT_HAS_UNREAD_CHANGED';
  public static EVENT_ON_OPEN_DATA_CHANNEL = 'EVENT_ON_OPEN_DATA_CHANNEL';
  public static EVENT_ON_CLOSE_DATA_CHANNEL = 'EVENT_ON_CLOSE_DATA_CHANNEL';

  public p2pContactStore: Store;
  public seenP2PMessageTimestampStore: Store;
  public hasUnreadMessage: boolean = false;

  public connector: p2p.P2PConnector;
  private baseProtocol: p2p.BaseProtocol;
  u2uProtocol: p2p.U2UProtocol;
  private signalingProtocol: p2p.SignalingProtocol;

  constructor(private settings: SettingsService,
              private user: UserService,
              private storage: StorageService,
              private $interval: angular.IIntervalService,
              private heat: HeatService,
              private $mdToast: angular.material.IToastService,
              private contactService: ContactService) {
    super();

    let closeConnector = () => {
      if (this.connector) {
        this.connector.close(false);
        this.connector = null;
      }
    };

    this.p2pContactStore = storage.namespace('p2pContacts');
    this.seenP2PMessageTimestampStore = storage.namespace('contacts.seenP2PMessageTimestamp');

    user.on(UserService.EVENT_UNLOCKED, () => {
      closeConnector();

      let protocols = [
        this.baseProtocol = new p2p.BaseProtocol(),
        this.u2uProtocol = new p2p.U2UProtocol(),
        this.signalingProtocol = new p2p.SignalingProtocol()
      ]

      this.connector = new p2p.P2PConnector(
        $interval, this, settings, this.user.publicKey,
        (roomName, peerId: string) => this.createRoomOnIncomingCall(roomName, peerId),
        peerId => this.processIncomingCall(peerId),
        (reason, protocol) => this.onError(reason, protocol),
        dataHex => this.sign(dataHex),
        (message, peerPublicKey) => this.encrypt(message, peerPublicKey),
        (message: heat.crypto.IEncryptedMessage, peerPublicKey: string) => this.decrypt(message, peerPublicKey),
        protocols
      );

      this.connector.setOnlineStatus("online");
      this.enterRoom(this.user.publicKey);
    });

    user.on(UserService.EVENT_LOCKED, closeConnector);
  }

  private encrypt(message: string | ArrayBuffer, recipientPublicKey: string) {
    if (message instanceof ArrayBuffer) {
      let options: heat.crypto.IEncryptOptions = {
        publicKey: converters.hexStringToByteArray(recipientPublicKey),
        privateKey: converters.hexStringToByteArray(heat.crypto.getPrivateKey(this.user.secretPhrase))
      }
      return heat.crypto.encryptBinary(message, options)
    }
    return heat.crypto.encryptMessage(message, recipientPublicKey, this.user.secretPhrase, false)
  }

  private decrypt(message: heat.crypto.IEncryptedMessage, peerPublicKey: string) {
    if (message.isText) {
      return heat.crypto.decryptMessage(message.data, message.nonce, peerPublicKey, this.user.secretPhrase, false)
    }
    return heat.crypto.decryptBinary(message.data, message.nonce, peerPublicKey, this.user.secretPhrase, false)
  }

  onMessage(msg: p2p.U2UMessage, room: p2p.Room) {
    this.emit(P2PMessaging.EVENT_NEW_MESSAGE, msg, room);
    this.seenP2PMessageTimestampStore.put(room.name + "_last-message-time", Date.now());
    this.updateSeenTime(null);
    this.displayNewMessagePopup(msg, room);

    this.contactService.getContacts().then(contacts => {
      let c = contacts.find(v => v.publicKey == msg.fromPeerId)
      if (!c) {
        let senderAccount = heat.crypto.getAccountIdFromPublicKey(msg.fromPeerId)
        if (senderAccount) {
          this.contactService.saveContact(senderAccount, msg.fromPeerId, null, -Date.now(), true)
        }
      }
    }).catch(reason => console.error(reason))
  }

  sendFile(messageId: string, file: File, recipientPublicKey: string) {
    file.arrayBuffer().then(buffer => {
      let bufferStr = converters.arrayBufferToString(buffer)
      let encrypted = this.encrypt(bufferStr, recipientPublicKey)
      let encryptedBuffer = converters.stringToArrayBuffer(JSON.stringify(encrypted))
      //this.heat.api.uploadFile(messageId, new Blob([new Uint8Array(encryptedBuffer)]))
      this.heat.api.uploadFile(messageId, new Blob([encryptedBuffer]))
    })
  }

  onFile(encryptedData: string | ArrayBuffer, fileDescriptor: { fileName: string; fileSize: number; fileSender: string }): any {
    let encryptedMessage: IEncryptedMessage = typeof encryptedData === "string"
      ? JSON.parse(encryptedData)
      : JSON.parse(converters.arrayBufferToString(encryptedData))
    let bufferStr = <string>this.decrypt(encryptedMessage, fileDescriptor.fileSender)
    let buffer = converters.stringToArrayBuffer(bufferStr)
    saveAs(new Blob([buffer], {type: "text/text"}), fileDescriptor.fileName)
  }

  onError(reason: string, protocol?: p2p.Protocol) {
    if (protocol == p2p.Protocol.U2U) {
      this.$mdToast.show(
        this.$mdToast.simple().textContent(`Error: ${reason}`).hideDelay(9000)
      );
    } else {
      console.log(`Messaging error: ${reason}\n Protocol: ${protocol}`);
    }
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
            let contactUtils = <ContactService>heat.$inject.get('contactService');
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
    room.sendMessage(new p2p.U2UMessage("contactUpdate", Date.now(), text));
  }

  /**
   * Create new room and register it on the signaling server.
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

  requestNewContact(recipient: string, text: string): p2p.Room {
    let room = this.enterRoom(recipient)
    //room.sendMessage(new p2p.U2UMessage("newContact", Date.now()))
    this.u2uProtocol.requestNewContact(recipient, this.user.publicKey, room, text)
    //this.connector.call(peerId, this.user.publicKey, room);
    return room;
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

  private processIncomingCall(callerPublicKey: string): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      // if peer is connected already confirm silently
      if (this.isPeerConnected(callerPublicKey)) {
        resolve();
        return;
      }

      let callerAccount = heat.crypto.getAccountIdFromPublicKey(callerPublicKey);

      let updateContactCallTime = (account: string, publicKey: string, publicName?: string) => {
        //save negative time to force to select contact in contact list
        this.contactService.saveContact(callerAccount, callerPublicKey, publicName, -Date.now());
      };

      this.heat.api.searchPublicNames(callerAccount, 0, 100).then(accounts => {
        let expectedAccount = accounts.find(value => value.publicKey == callerPublicKey)
        let caller = expectedAccount ? expectedAccount.publicName : callerAccount
        let closeDialogOnConnected = (mdDialog: angular.material.IDialogService) => {
          let interval = this.$interval(() => {
            if (this.isPeerConnected(callerPublicKey)) {
              mdDialog.cancel("Already connected");
              this.$interval.cancel(interval);
              updateContactCallTime(callerAccount, callerPublicKey,  caller);
            }
          }, 500, 7, false);
        };
        let notes = expectedAccount ? null : `Note the caller has no registered in the blockchain`
        dialogs.confirm(
          "Incoming connect request",
          `Account &nbsp;&nbsp;<b>${caller}</b>&nbsp;&nbsp; wants to connect with you.
           Accepting connection will share your current IP address.
           <p><strong>Accept or decline?</strong> Click OK to accept, Cancel to decline.</p>
           ${notes || ""}`,
          closeDialogOnConnected
        ).then(() => {
          updateContactCallTime(callerAccount, callerPublicKey, expectedAccount ? expectedAccount.publicName : null);
          resolve();
        });
      });
    });
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, messageText?: string): p2p.CallDialog {
    return new p2p.CallDialog($event, this.heat, this.user, recipient, recipientPublicKey, messageText, this);
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
