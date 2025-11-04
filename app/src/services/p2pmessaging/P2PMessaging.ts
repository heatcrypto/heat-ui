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
type RemoveMessageDoneAccumulator = {roomName: string, targetMessageId: string, fileId: string, error: string}[];
type RoomMessagesAccumulator = {msg: any, room: p2p.Room}[];

/**
 * This class is bridge between heat-ui components and p2p connector low level components (which intended to be independent of heat-ui).
 * So this service is intended to provide p2p connector to the heat-ui functions.
 */
@Service('P2PMessaging')
@Inject('settings', 'user', 'storage', '$interval', 'heat', '$mdToast', 'contactService', 'env')
class P2PMessaging extends EventEmitter implements p2p.P2PMessenger {

  public static EVENT_NEW_MESSAGE = 'EVENT_NEW_MESSAGE';
  public static EVENT_HAS_UNREAD_CHANGED = 'EVENT_HAS_UNREAD_CHANGED';
  public static EVENT_ON_OPEN_DATA_CHANNEL = 'EVENT_ON_OPEN_DATA_CHANNEL';
  public static EVENT_ON_CLOSE_DATA_CHANNEL = 'EVENT_ON_CLOSE_DATA_CHANNEL';
  public static EVENT_UPDATE_SEEN_TIME = 'EVENT_UPDATE_SEEN_TIME';

  public hasUnreadMessage: boolean = false;

  public connector: p2p.P2PConnector;

  private _state: string //empty string means is ok

  private baseProtocol: p2p.BaseProtocol;
  u2uProtocol: p2p.U2UProtocol;
  private signalingProtocol: p2p.SignalingProtocol;

  moment = {
    registerLastMessageTime: (roomKey) => db.putValue(roomKey + "_last-message-time", Date.now()),
    getLastMessageTime: (roomKey) => db.getValue(roomKey + "_last-message-time"),
    registerSeenTime: (roomKey, timestamp: number) => db.putValue(roomKey, timestamp || (Date.now() - 500)),
    getSeenTime: (roomKey) => db.getValue(roomKey)
  }

  constructor(private settings: SettingsService,
              private user: UserService,
              private storage: StorageService,
              private $interval: angular.IIntervalService,
              private heat: HeatService,
              private $mdToast: angular.material.IToastService,
              private contactService: ContactService,
              private env: EnvService) {
    super();

    this._state = 'not ready'

    let closeConnector = () => {
      if (this.connector) {
        this.connector.close(true)
        this.connector = null
        this._state = 'connection is closed'
      }
    };

    user.on(UserService.EVENT_UNLOCKED, () => {
      closeConnector()

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
      )

      this.connector.setOnlineStatus("online")
      this.enterRoom(this.user.publicKey)

      this._state = ''
    });

    user.on(UserService.EVENT_LOCKED, closeConnector);
  }

  get state(): string {
    return this._state || this.connector.state
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
    //this.seenP2PMessageTimestampStore.put(room.key + "_last-message-time", Date.now());
    this.moment.registerLastMessageTime(room.key).then(() => {
      this.updateSeenTime(null);
      this.displayNewMessagePopup(msg, room);
    }).then(() => {
      return this.contactService.getContacts().then(contacts => {
        let c = contacts.find(v => v.publicKey == msg.fromPeerId)
        if (!c) {
          let senderAccount = heat.crypto.getAccountIdFromPublicKey(msg.fromPeerId)
          if (senderAccount) {
            this.contactService.saveContact(msg.fromPeerId, null, -Date.now(), true)
          }
        }
      }).catch(reason => console.error(reason))
    })
  }

  sendFile(messageId: string, file: File, recipientPublicKey: string) {
    if (this.env.isBrowser) {
      return file.arrayBuffer().then(arrayBuffer => {
        let encrypted = this.encrypt(arrayBuffer, recipientPublicKey)
        let encryptedBuffer = converters.stringToArrayBuffer(JSON.stringify(encrypted))
        return this.heat.api.uploadFile(messageId, encryptedBuffer)
      }).catch(reason => {
        this.$mdToast.show(this.$mdToast.simple().textContent(
          `Error on file uploading: ${reason?.description || reason?.data?.errorDescription}`
        ).hideDelay(6000))
      })
    } else {
      let p: Promise<ArrayBuffer> = new Promise<ArrayBuffer>((resolve, reject) => {
        let fs = require("fs")
        // @ts-ignore
        fs.readFile(file.path, function (err, data) {
          if (err) reject(err)
          else resolve(data.buffer)
        })
      })
      // @ts-ignore
      return p.then(arrayBuffer => {
        let encrypted = this.encrypt(arrayBuffer, recipientPublicKey)
        let encryptedBuffer = converters.stringToArrayBuffer(JSON.stringify(encrypted))
        return this.heat.api.uploadFile(messageId, encryptedBuffer)
      }).catch(reason => {
        this.$mdToast.show(this.$mdToast.simple().textContent(
          `Error on file uploading: ${reason?.description || reason?.data?.errorDescription}`
        ).hideDelay(6000))
      })
    }
  }

  onFile(fileContent: string | ArrayBuffer, room: p2p.Room,
         fileTransferMessageId: string, fileDescriptor: { fileName: string; fileSize: number; fileSender: string },
         fileSavedCallback?: Function): any {
    let encryptedMessage: heat.crypto.IEncryptedMessage = typeof fileContent === "string"
      ? JSON.parse(fileContent)
      : JSON.parse(converters.arrayBufferToString(fileContent))
    let buffer = <ArrayBuffer>this.decrypt(encryptedMessage, fileDescriptor.fileSender)

    dialogs.confirm(
      "Save file",
      "Note the file will be deleted on the server after you confirm this.<br>Do you want to save the file on your device?"
    ).then(() => {
      saveAs(new Blob([buffer], {type: "text/text"}), fileDescriptor.fileName)
      setTimeout(() => {
        this.u2uProtocol.sendFileIsReceived(fileTransferMessageId)
        let extraInfo: p2p.MessageStatus = {status: {stage: 2, fileIndicator: 2}}
        room.getMessageHistory().updateMessageStatus(fileTransferMessageId, {status: {stage: 2, fileIndicator: 2}})
        if (fileSavedCallback) fileSavedCallback()
      }, 250)
    })
  }

  onServerMessageRemoved(messages: RemoveMessageDoneAccumulator): void {
    messages.filter(v => !v.error)
    this.$mdToast.show(
      this.$mdToast.simple().textContent(`${messages.length} messages have been deleted on the server`).hideDelay(9000)
    )
  }

  onServerMessageExistsCallbacks: Map<string, Function> = new Map<string, Function>()

  onServerMessageExists(targetMessageId: string, message: boolean, file: boolean): void {
    let callback = this.onServerMessageExistsCallbacks.get(targetMessageId)
    if (callback) callback(message, file)
  }

  onError(reason: string, protocol?: p2p.Protocol) {
    if (protocol == p2p.Protocol.U2U) {
      this.$mdToast.show(
        this.$mdToast.simple().textContent(`Error: ${reason}`).hideDelay(9000)
      );
    } else {
      console.error(`Messaging error: ${reason}\n Protocol: ${protocol}`);
    }
  }

  /**
   * Accumulated messages for debounced popup UI that display aggregated info
   */
  private roomMessagesAccumulator: RoomMessagesAccumulator = []

  /**
   * Display aggregated message for received messages between debounced invokes
   */
  private displayNewMessagePopup(msg: any, room: p2p.Room) {
    this.roomMessagesAccumulator.push({msg: msg, room: room})
    this.displayNewMessagePopupDebounced(this.roomMessagesAccumulator, heat)
  }

  private displayNewMessagePopupDebounced: (roomMessages: RoomMessagesAccumulator, heat) => void = utils.debounce(
      (roomMessages: RoomMessagesAccumulator, heat) => {
        if (roomMessages.length == 1) {
          let msg = roomMessages[0].msg
          if ((msg.type == "chat" || msg.type == "file") && msg.text) {
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
            let contactAccount = heat.crypto.getAccountIdFromPublicKey(msg.fromPeerId);
            let publicKey = msg.fromPeerId
            this.heat.api.searchPublicNames(contactAccount, 0, 100).then((accounts)=> {
              let expectedAccount = accounts.find(value => value.publicKey == publicKey);
              if (expectedAccount) {
                let contactUtils = <ContactService>heat.$inject.get('contactService');
                contactUtils.updateContactCurrencyAddress(contactAccount, parsedMessage.name, parsedMessage.address, publicKey, expectedAccount.publicName, -Date.now())
              }
            })
          }
        } else if (roomMessages.length > 1) {
          this.$mdToast.show(
              this.$mdToast.simple().textContent(`${roomMessages.length} new messages`).hideDelay(6000)
          );
        }

        roomMessages.length = 0
      },
      1000, false
  );

  set onlineStatus(status: OnlineStatus) {
    this.connector?.setOnlineStatus(status);
  }

  get onlineStatus(): OnlineStatus {
    return this.connector?.onlineStatus;
  }

  getOneToOneRoom(peerId: string, required?: boolean): p2p.Room {
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room && required) {
      room = this.setupRoom(new p2p.Room(this, this.connector, this.user, [peerId]));
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
      room = this.setupRoom(new p2p.Room(this, this.connector, this.user, [peerId]));
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
    this.moment.getLastMessageTime(room.key).then(t => room.lastIncomingMessageTimestamp = t || 0)
    room.hasUnreadMessage  // to read the value from db
    return room
  }

  private generateOneToOneRoomName(peerOnePublicKey: string, peerTwoPublicKey: string) {
    let arr = [heat.crypto.getAccountIdFromPublicKey(peerOnePublicKey), heat.crypto.getAccountIdFromPublicKey(peerTwoPublicKey)];
    arr.sort();
    return arr[0] + "-" + arr[1];
  }

  private createRoomOnIncomingCall(roomName: string, peerId: string) {
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = this.setupRoom(new p2p.Room(this, this.connector, this.user, [peerId]));
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
        this.contactService.saveContact(callerPublicKey, publicName, -Date.now());
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

  /**
   * The seen time is needed to display mark for contact when it receives the new unread messages.
   */
  updateSeenTime(roomKey: string, timestamp?: number) {
    let p = Promise.resolve()
    if (roomKey) {
      p = p.then(() => this.moment.registerSeenTime(roomKey, timestamp))
    }

    p.then(() => {
      //update read status on all rooms
      let unreadRooms = [];
      this.connector.rooms.forEach(room => {
        if (room.hasUnreadMessage) {
          unreadRooms.push(room);
        }
      });
      let nowHasUnreadMessage = unreadRooms.length > 0;
      if (nowHasUnreadMessage != this.hasUnreadMessage) {
        this.hasUnreadMessage = nowHasUnreadMessage;
        this.emit(P2PMessaging.EVENT_HAS_UNREAD_CHANGED, unreadRooms);
      }
    })
  }

  checkToRemoveServerMessage(messageType: p2p.MessageType, outgoing: boolean,
                             transport: p2p.TransportType, targetMessageId: string, extraInfo: p2p.MessageStatus) {
    if (outgoing && (transport == "server" || messageType == "file")) {
      if (messageType == "file" || !extraInfo || extraInfo.status?.stage != 1) {
        this.u2uProtocol.sendRemoveMessage(targetMessageId)
      }
    }
  }

  requestIsMessageExists(messageType: p2p.MessageType, outgoing: boolean, transport: p2p.TransportType,
                         targetMessageId: string, extraInfo: p2p.MessageStatus,
                         callback: (message: boolean, file: boolean) => void) {
    if (outgoing && (transport == "server" || messageType == "file")) {
      if (messageType == "file" || !extraInfo || extraInfo.status?.stage != 1) {
        this.onServerMessageExistsCallbacks.set(targetMessageId, callback)
        setTimeout(() => this.onServerMessageExistsCallbacks.delete(targetMessageId), 12000)
        this.u2uProtocol.requestIsMessageExists(targetMessageId) //the callback will be invoked by response to this request
        return
      }
    }
    callback(null, null)
  }

  contactStatus(contactPubKey) {
    if (!contactPubKey) return
    let room = this.getOneToOneRoom(contactPubKey)
    if (!room) return
    let peer = room.getPeer(contactPubKey)
    if (peer?.isConnected()) {
      return "channelOpened"
    } else {
      //if (room.state.entered == "entered") { //it is more corerctly, but need the callback like room.onEntered()
      if (room?.state.entered != "not") {
        return "roomRegistered"
      }
    }
  }

}
