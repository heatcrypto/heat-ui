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

@Service('P2PMessaging')
@Inject('settings', 'user', 'storage', '$interval', 'heat')
class P2PMessaging {

  //private rooms: Map<string, Room> = new Map<string, Room>();
  private connector: P2PConnector;
  public p2pContactStore: Store;

  constructor(private settings: SettingsService,
              private user: UserService,
              private storage: StorageService,
              private $interval: angular.IIntervalService,
              private heat: HeatService) {

    this.connector = new P2PConnector(settings, $interval);
    this.connector.setup(
      this.user.publicKey,
      (roomName, peerId: string) => this.createRoomOnIncomingCall(roomName, peerId),
      peerId => this.confirmIncomingCall(peerId),
      reason => this.onSignalingError(reason),
      dataHex => this.sign(dataHex)
    );

    this.p2pContactStore = storage.namespace('p2pContacts');
  }

  /**
   * Register me so can be called.
   */
  // register(): Room {
  //   let name = this.user.publicKey;
  //   let room = this.connector.rooms.get(name);
  //   if (!room) {
  //     room = new Room(this.user.publicKey, this.connector, this.storage, this.user);
  //     // room.confirmIncomingCall = peerId => this.confirmIncomingCall(peerId);
  //     // room.onMessage = msg => this.onMessage(msg);
  //     // room.onFailure = e => this.onError(e);
  //     // room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
  //     // room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
  //     // room.rejected = (byPeerId, reason) => {
  //     //   this.messages.push("Peer '" + byPeerId + "' rejected me. Reason: " + reason);
  //     //   this.$scope.$apply();
  //     // };
  //     room.enter();
  //     this.connector.rooms.set(name, room);
  //   }
  //   return room;
  // }

  /**
   * Returns room with single peer.
   */
  getRoom(peerId: string): Room {
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (room && room.getAllPeers().size <= 1) {
      //todo check is opened channel
      return room;
    }
  }

  /**
   * Creates new room and registers it on the signaling server.
   */
  enterRoom(peerId: string): Room {
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = new Room(roomName, this.connector, this.storage, this.user, [peerId]);
      room.enter();
    }
    return room;
  }

  call(peerId: string): Room {
    let room = this.enterRoom(peerId);
    this.connector.call(peerId, this.user.publicKey, room);
    return room;
  }

  onSignalingError(reason: string) {
    console.log("Signaling error: " + reason);
  }

  sign(dataHex: string): ProvingData {
    //proof the passed to room public key is owned
    let signature = heat.crypto.signBytes(dataHex, converters.stringToHexString(this.user.secretPhrase));
    return {signatureHex: signature, dataHex: dataHex, publicKeyHex: this.user.publicKey}
  }

  private generateOneToOneRoomName(peerOnePublicKey: string, peerTwoPublicKey: string) {
    let arr = [heat.crypto.getAccountIdFromPublicKey(peerOnePublicKey), heat.crypto.getAccountIdFromPublicKey(peerTwoPublicKey)];
    arr.sort();
    return arr[0] + "-" + arr[1];
  }

  private createRoomOnIncomingCall(roomName: string, peerId: string) {
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = new Room(roomName, this.connector, this.storage, this.user, [peerId]);
      // room.confirmIncomingCall = peerId => this.confirmIncomingCall(peerId);
      // room.onFailure = e => this.onError(e);
      // room.onMessage = msg => this.onMessage(msg);
      // room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
      // room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
      this.connector.rooms.set(roomName, room);
    }
    return room;
  }

  private confirmIncomingCall(peerId: string): Promise<any> {
    return new Promise<any>((resolve) => {
      //todo get public name instead account
      let peerAccount = heat.crypto.getAccountIdFromPublicKey(peerId);
      dialogs.confirm("Incoming call", `User ${peerAccount} calls you.`).then(() => {
        this.saveContact(peerAccount, peerId);
        resolve();
      });
    });
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, userMessage?: string): CallDialog {
    return new CallDialog($event, this.heat, this.user, recipient, recipientPublicKey, this);
  }

  saveContact(account: string, publicKey: string) {
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (!contact) {
      contact = {
        account: account,
        privateName: '',
        publicKey: publicKey,
        publicName: '',
        timestamp: Date.now()
      };
      this.p2pContactStore.put(account, contact);
    }
  }

}

/**
 * Dialog for calling other user to establish WebRTC channel.
 */
class CallDialog extends GenericDialog {

  constructor($event,
              private heat: HeatService,
              private user: UserService,
              private recipient: string,
              private recipientPublicKey: string,
              private p2pmessaging: P2PMessaging) {
    super($event);
    this.dialogTitle = 'Call user';
    this.dialogDescription = 'Description on how to lease balance';
    this.okBtnTitle = 'Call';
  }

  /* @override */
  getFields($scope: angular.IScope) {
    var builder = new DialogFieldBuilder($scope);
    return [
      builder
        .account('recipient', this.recipient)
        .label('Callee')
        .required()
        .onchange(newValue => this.onChangeRecipient($scope, newValue))
    ]
  }

  getTransactionBuilder(): TransactionBuilder {
    return undefined;
  }

  okBtn() {
    this.heat.api.getPublicKey(this.fields['recipient'].value).then(
      (publicKey) => {
        let room = this.p2pmessaging.call(publicKey);

        let peerAccount = heat.crypto.getAccountIdFromPublicKey(publicKey);
        this.p2pmessaging.saveContact(peerAccount, publicKey);

        let peer = room.getPeer(publicKey);
        if (peer && peer.isConnected()) {
          this.okBtn['mdDialog'].hide(room);
        } else {
          room.onOpenDataChannel = peerId => {
            this.okBtn['mdDialog'].hide(room);
          };
        }
      }, reason => {
      }
    );
  }

  private onChangeRecipient($scope: angular.IScope, newRecipient) {

  }

}

/**
 * Room it is the way to connect peers. When two peers (client apps) will create the room object with the same name
 * they will get the WebRTC channel between each other (if signaling happened succesfully).
 * The room property peers may no contains entry of peer until the peer enter the room in his application.
 */
class Room {

  constructor(public name: string,
              private connector: P2PConnector,
              private storage: StorageService,
              private user: UserService,
              public memberPublicKeys: string[]) {
  }

  state: {approved: boolean, entered: boolean} = {
    approved: false,
    entered: false
  };

  private peers: Map<string, RTCPeer> = new Map<string, RTCPeer>();
  private messageHistory: MessageHistory;

  /**
   * If room not exists registers the room on the server (signaling server).
   * Registers user in the room in the server.
   */
  enter() {
    this.connector.enter(this);
    return this;
  }

  /**
   * Sends message to all members of room (all peers in the room).
   * Returns count of peers to which message sent.
   */
  sendMessage(message: P2PMessage): number {
    let count = this.connector.sendMessage(this.name, message);
    if (message.type == "chat") {
      let item = {timestamp: message.timestamp, fromPeer: this.user.publicKey, message: message.text};
      this.getMessageHistory().put(item);
      if (this.onNewMessageHistoryItem) {
        this.onNewMessageHistoryItem(item);
      }
    }
    return count;
  }

  onMessageInternal(msg: any) {
    if (msg.type == "chat") {
      let item = {timestamp: msg.timestamp, fromPeer: msg.fromPeerId, message: msg.text};
      this.getMessageHistory().put(item);
      if (this.onNewMessageHistoryItem) {
        this.onNewMessageHistoryItem(item);
      }
    }
    if (this.onMessage) {
      this.onMessage(msg);
    }
  }

  onNewMessageHistoryItem: (item: MessageHistoryItem) => any;

  /**
   * On receiving message callback.
   */
  onMessage: (msg: {}) => any;

  /**
   * On failure callback.
   */
  onFailure: (peerId: string, e: any) => any;

  /**
   * On opening channel callback.
   */
  onOpenDataChannel: (peerId: string) => any;

  /**
   * On closing channel callback.
   */
  onCloseDataChannel: (peerId: string) => any;

  /**
   * Invoked when peer rejects connection to him.
   */
  onRejected: (byPeerId: string, reason: string) => any;

  /**
   * Invoked on offer from remote peer to establish p2p channel. Needs to resolve promise if user allows call.
   * It is default implementation allowing all calls.
   */
  // confirmIncomingCall: (peerId: string) => Promise<void> = (peerId: string) => {
  //   return Promise.resolve();
  // };


  getMessageHistory() {
    if (!this.messageHistory) {
      this.messageHistory = new MessageHistory(this, this.storage, this.user);
    }
    return this.messageHistory;
  }

  /**
   * Public key is proven. Returns true if the public key owner is allowed to connect.
   * @param room
   * @param peerId
   * @param publicKey
   */
  provenPublicKeyAllowed(room: Room, peerId: string, publicKey: any): boolean {
    if (true /*existing public key*/)
      return true;
  }

  getDataChannels() {
    let dataChannels: RTCDataChannel[] = [];
    this.peers.forEach(peer => {
      if (peer.dataChannel) {
        dataChannels.push(peer.dataChannel)
      }
    });
    return dataChannels;
  }

  getPeer(peerId: string) {
    return this.peers.get(peerId);
  }

  createPeer(peerId: string, publicKey: string) {
    if (this.memberPublicKeys.indexOf(publicKey) == -1) {
      return;  //do not create peer for not room member
    }
    let existingPeer = this.peers.get(peerId);
    if (existingPeer) {
      return existingPeer;
    }
    let p: RTCPeer = new RTCPeer(publicKey);
    this.peers.set(peerId, p);
    return p;
  }

  getAllPeers() {
    return this.peers;
  }

}

interface P2PMessage {
  timestamp: number,
  type: "chat" | "",
  text: string
}

interface ProvingData {
  signatureHex: string,
  dataHex: string,
  publicKeyHex: string
}

class RTCPeer {
  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  publicKey: string;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;

  isConnected() {
    return this.dataChannel && this.dataChannel.readyState == "open"
  }
}

interface MessageHistoryItem {
  timestamp: number,
  fromPeer: string,
  message: string
}

class MessageHistory {

  //todo migrate from localStorage to IndexedDB

  static MAX_PAGES_COUNT = 200; //max number of pages for one room
  static MAX_PAGE_LENGTH = 100; //it is the count of messages in one item of localStorage

  private enabled: boolean;

  private store: Store;
  // private db: IDBDatabase;

  private page: number; //current page number
  private pageContent: Array<MessageHistoryItem>;
  private pages: number[];

  constructor(private room: Room,
              private storage: StorageService,
              private user: UserService) {

    this.enabled = true;

    // will use indexeddb later
    // if (window.indexedDB) {
    //   let dbRequest = window.indexedDB.open("P2PMessaging", 1);
    //   dbRequest.onerror = function(event) {
    //     console.log("IndexedDB request error: " + event.target.errorCode);
    //   };
    //   dbRequest.onsuccess = (event) => {
    //     this.db = dbRequest.result;
    //     this.db.onerror = (event) => {
    //       console.log("IndexedDB error: " + event.target.errorCode);
    //       this.enabled = false;
    //     };
    //   };
    //   dbRequest.onupgradeneeded = (event) => {
    //     this.db = event.target.result;
    //     let objectStore = this.db.createObjectStore("name", { keyPath: "myKey" });
    //   };
    // } else {
    //   console.log("Your browser doesn't support a stable version of IndexedDB. So message history is disabled.");
    //   this.enabled = false;
    // }

    this.store = storage.namespace('p2p-messages.' + this.room.name);
    this.pages = this.store.keys().map(value => parseInt(value)).sort();
    if (this.pages.length == 0) {
      this.pages.push(this.page = 0);
    } else {
      this.page = this.pages[this.pages.length - 1];
      this.pageContent = this.getItems(this.pages.length - 1);
    }
    this.pageContent = this.pageContent ? this.pageContent : new Array<MessageHistoryItem>();
  }

  public getPageCount() {
    return this.pages.length;
  }

  /**
   * Returns messages by page.
   * @param page in range [0, MessageHistory.getPageCount()]
   */
  public getItems(page: number): Array<MessageHistoryItem> {
    if (page >= 0 && page < this.pages.length) {
      let v = this.store.getString('' + this.pages[page]);
      if (v) {
        try {
          let encrypted = JSON.parse(v);
          let pageContentStr = heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, this.user.publicKey, this.user.secretPhrase);
          return JSON.parse(pageContentStr);
        } catch (e) {
          console.log("Error on parse/decrypt message history page");
        }
      }
    }
    return [];
  }

  public put(item: MessageHistoryItem) {
    this.pageContent.push(item);
    this.savePage(this.page, this.pageContent);
    if (this.pageContent.length >= MessageHistory.MAX_PAGE_LENGTH) {
      this.pageContent = [];
      this.page++;
      this.pages.push(this.page);
    }
    if (this.pages.length > MessageHistory.MAX_PAGES_COUNT) {
      this.store.remove('' + this.pages[0]);
      this.pages.splice(0, 1);
    }
  }

  //using timestamp as message id is not ideal, but it is quick solution
  public remove(timestamp: number) {
    //todo remove message on the remote peers also
    //iterate from end to begin because more likely user removed the recent message
    for (let page = this.pages.length - 1; page >= 0; page--) {
      let items = this.getItems(page);
      if (items) {
        let newItems = items.filter(item => item.timestamp != timestamp);
        if (items.length != newItems.length) {
          this.savePage(this.pages[page], newItems);
        }
      }
    }
  }

  private savePage(page: number, pageContent: Array<MessageHistoryItem>) {
    //todo messages encryption
    try {
      let encrypted = heat.crypto.encryptMessage(JSON.stringify(pageContent), this.user.publicKey, this.user.secretPhrase, false);
      this.store.put('' + page, JSON.stringify(encrypted));
    } catch (domException) {
      if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(domException.name) > 0) {
        //todo shrink history of all accounts when reach storage limit
      }
      this.store.put('' + page, JSON.stringify(pageContent));
    }
  }

}

/**
 * Provides WebRTC channels through rooms using signaling server.
 * Keeps websocket connection alive so that other party will can to establish WebRTC channel using signaling websocket connection.
 */
class P2PConnector {

  rooms: Map<string, Room> = new Map<string, Room>(); // roomName -> room

  private static MSG_TYPE_CHECK_CHANNEL = "CHECK_CHANNEL";
  private static MSG_TYPE_REQUEST_PROOF_IDENTITY = "GET_PROOF_IDENTITY";
  private static MSG_TYPE_RESPONSE_PROOF_IDENTITY = "PROOF_IDENTITY";

  private webSocketPromise: Promise<WebSocket>;
  private signalingMessageAwaitings: Function[] = [];
  private notAcceptedResponse = "notAcceptedResponse_@)(%$#&#&";

  private createRoom: (name: string, peerId) => Room;
  private confirmIncomingCall: (caller: string) => Promise<void>;
  private sign: (dataHex: string) => ProvingData;
  private signalingError: (reason: string) => void;

  private pendingIdentity: string;
  private identity: string;
  private pendingRooms: Function[] = [];
  private pendingOnlineStatus: Function;
  private signalingReady: boolean = null;
  private config = {iceServers: [{urls: 'stun:23.21.150.121'}, {urls: 'stun:stun.l.google.com:19302'}]};
  private pingSignalingInterval;

  constructor(private settings: SettingsService, private $interval: angular.IIntervalService) {
  }

  /**
   * @param identity
   * @param createRoom function to create the room on incoming call
   * @param confirmIncomingCall function to accept the caller
   * @param signalingError
   * @param sign Signing delegated to client class because this service class should not to have deal with secret info
   */
  setup(identity: string,
        createRoom: (name: string, peerId) => Room,
        confirmIncomingCall: (caller: string) => Promise<void>,
        signalingError: (reason: string) => void,
        sign: (dataHex: string) => ProvingData) {
    this.pendingIdentity = identity;
    this.createRoom = createRoom;
    this.confirmIncomingCall = confirmIncomingCall;
    this.sign = sign;
    this.signalingError = signalingError;
  }

  /**
   * Sets online status on the server side for the peer associated with this connector (websocket connection for signaling).
   */
  setOnlineStatus(status: string) {
    let sendOnlineStatus = () => {
      this.sendSignalingMessage([{type: "SET_ONLINE_STATUS", status: status}]);
    };
    if (this.identity) {
      sendOnlineStatus();
    } else {
      this.sendSignalingMessage([{type: "WANT_PROVE_IDENTITY"}]);
      this.pendingOnlineStatus = sendOnlineStatus;
    }
  }

  getOnlineStatus(peerId: string): Promise<string> {
    return this.request(
      () => this.sendSignalingMessage([{type: "GET_ONLINE_STATUS", peerId: peerId}]),
      (msg) => {
        if (msg.type === "ONLINE_STATUS" && msg.peerId == peerId)
          return msg.status;
        return this.notAcceptedResponse;
      })
  }

  call(toPeerId: string, caller: string, room: Room) {
    this.enter(room);
    this.sendSignalingMessage([{type: "CALL", toPeerId: toPeerId, caller: caller, room: room.name}]);
  }

  getTmp(roomName: string): Promise<Array<string>> {
    return this.request(
      () => this.sendSignalingMessage([{type: "WHO_ONLINE"}]),
      (msg) => {
        if (msg.type === "WHO_ONLINE")
          return msg.remotePeerIds;
        return this.notAcceptedResponse;
      })
  }

  enter(room: Room) {
    let existingRoom = this.rooms.get(room.name);
    if (existingRoom && existingRoom.state.entered) {
      return;
    }
    let requestEnterRoom = () => {
      room.state.approved = true;
      if (!room.state.entered) {
        this.sendSignalingMessage([{type: "ROOM", room: room.name}]);
      }
    };

    this.rooms.set(room.name, room);

    if (this.identity) {
      requestEnterRoom();
    } else {
      this.pendingRooms.push(requestEnterRoom);
      this.sendSignalingMessage([{type: "WANT_PROVE_IDENTITY"}]);
      return;
    }
  }

  /**
   * Resolves opened websocket.
   */
  getWebSocket() {
    if (!this.webSocketPromise || this.signalingReady === false) {
      this.webSocketPromise = new Promise((resolve, reject) => {
          let url = this.settings.get(SettingsService.HEAT_WEBSOCKET);
          let socket = new WebSocket(url);
          console.log("new socket, readyState=" + socket.readyState);
          socket.onopen = () => {
            socket.onmessage = (msg) => this.onSignalingMessage(msg);
            socket.onclose = () => this.onSignalingChannelClosed();
            this.signalingReady = true;
            if (this.pingSignalingInterval) {
              this.$interval.cancel(this.pingSignalingInterval);
            }
            this.pingSignalingInterval = this.$interval(() => {
              this.pingSignalingServer(socket);
            }, 120 * 1000, 0, false);
            resolve(socket);
          };
          socket.onerror = (error) => {
            console.log(error);
            reject(error);
          };
        }
      );
    }
    return this.webSocketPromise;
  }

  private pingSignalingServer(socket: WebSocket) {
    if (this.signalingReady) {
      this.sendSignalingMessage([{type: "PING"}]);
    }
  }

  sendSignalingMessage(message: any[]): Promise<any> {
    return this.getWebSocket().then(websocket => {
      message.splice(0, 0, "webrtc");
      websocket.send(JSON.stringify(message));
      console.log("sendSignalingMessage \n"+JSON.stringify(message));
    }, reason => console.log(reason))
  }

  onSignalingMessage(message) {
    console.log("onSignalingMessage \n"+ message.data);
    let msg = JSON.parse(message.data);
    let roomName: string = msg.room;

    if (msg.type === 'PONG') {
      console.log("signaling pong");
    } else if (msg.type === 'PROVE_IDENTITY') {
      let signedData = this.sign(msg.data);
      signedData["type"] = P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY;
      this.sendSignalingMessage([signedData]);
    } else if (msg.type === 'APPROVED_IDENTITY') {
      this.identity = this.pendingIdentity;
      this.pendingRooms.forEach(f => f());
      this.pendingRooms = [];
      if (this.pendingOnlineStatus)
        this.pendingOnlineStatus();
      this.pendingOnlineStatus = null;
    } else if (msg.type === 'CALL') {
      let caller: string = msg.caller;
      this.confirmIncomingCall(caller).then(value => {
        let room = this.createRoom(roomName, caller);
        this.enter(room);
      });
    } else if (msg.type === 'ERROR') {
      this.signalingError(msg.reason);
    } else if (msg.type === 'WELCOME') {  //welcome to existing room
      let room = this.rooms.get(roomName);
      room.state.entered = true;
      msg.remotePeerIds.forEach((peerId: string) => {
        let peer = room.createPeer(peerId, peerId);
        if (peer) {
          if (!peer.peerConnection) {
            this.createPeerConnection(roomName, peerId);
          }
          if (!peer.isConnected()) {
            this.doOffer(roomName, peerId);
          }
        }
      });
    } else if (msg.type === 'offer') {
      let peerId: string = msg.fromPeer;
      let peer = this.rooms.get(roomName).createPeer(peerId, peerId);
      if (peer && !peer.isConnected()) {
        let room = this.rooms.get(roomName);
        let pc = peer.peerConnection;
        if (pc && pc.iceConnectionState != "connected") {
          pc.close();
          pc = null;
        }
        if (!pc) {
          pc = this.createPeerConnection(roomName, peerId);
        }
        if (pc) {
          pc.setRemoteDescription(new RTCSessionDescription(msg))
            .catch(e => {
              if (room.onFailure) {
                room.onFailure(peerId, e);
              } else {
                console.log(e.name + "  " + e.message);
              }
            });
          this.doAnswer(roomName, peerId);
        }
      }
    } else if (msg.type === 'answer') {
      let room = this.rooms.get(roomName);
      let pc = room.getPeer(msg.fromPeer).peerConnection;
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(msg))
          .catch(e => {
            if (room.onFailure) {
              room.onFailure(msg.fromPeer, e);
            } else {
              console.log(e.name + "  " + e.message);
            }
          });
        console.log("got answer");
      }
    } else if (msg.type === 'candidate') {
      let pc = this.rooms.get(roomName).getPeer(msg.fromPeer).peerConnection;
      let candidate = new RTCIceCandidate({
        sdpMLineIndex: msg.label,
        candidate: msg.candidate
      });
      pc.addIceCandidate(candidate)
        .catch(e => {
          console.log("Failure during addIceCandidate(): " + e.name);
          this.rooms.get(roomName).onFailure(msg.fromPeer, e.name);
        });
      console.log("addIceCandidate");
      // } else if (msg.type === 'GETROOM') {
      //   this.room = msg.value;
      //   this.onRoomReceived(this.room);
      //   //printState("Room received");
    } else if (msg.type === 'WRONGROOM') {
      //window.location.href = "/";
      console.log("Wrong room");
    } else {
      this.signalingMessageAwaitings.forEach(f => f(msg));
    }
  }

  onSignalingChannelClosed() {
    this.signalingReady = false;
    this.$interval.cancel(this.pingSignalingInterval);
  }

  createPeerConnection(roomName: string, peerId: string) {
    let peer = this.rooms.get(roomName).getPeer(peerId);
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(this.config);
      pc.onicecandidate = (event) => {
        if (event.candidate)
          this.sendSignalingMessage([{room: roomName, toPeerId: peerId}, {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
          }]);
      };
      pc.ondatachannel = (event) => {
        let dataChannel = event.channel;
        console.log('Received data channel creating request');  //calee do
        this.initDataChannel(roomName, peerId, dataChannel, true);
        console.log("init Data Channel");
        peer.dataChannel = dataChannel;
      };
      pc.oniceconnectionstatechange = (event: Event) => {
        if (pc.iceConnectionState == 'disconnected') {
          if (peer.dataChannel) {
            peer.dataChannel.close();
            this.onCloseDataChannel(roomName, peerId, peer.dataChannel);
          }
          console.log('Disconnected');
        }
      };

      peer.peerConnection = pc;

      return pc;
    } catch (e) {
      console.log(e);
      pc = null;
      return;
    }
  }

  initDataChannel(roomName: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
    dataChannel.onopen = (event) => this.onOpenDataChannel(roomName, peerId, dataChannel, sendCheckingMessage);
    dataChannel.onclose = (event) => this.onCloseDataChannel(roomName, peerId, dataChannel);
    dataChannel.onmessage = (event) => this.onMessage(roomName, peerId, dataChannel, event);
    this.rooms.get(roomName).getPeer(peerId).dataChannel = dataChannel;
    console.log(`initDataChannel ${roomName} ${peerId} ${dataChannel.label}`);
  }

  onOpenDataChannel(roomName: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
    if (sendCheckingMessage) {
      let checkChannelMessage = {"type": P2PConnector.MSG_TYPE_CHECK_CHANNEL, "room": roomName, "value": ("" + Math.random())};
      //send checking message to signaling server,
      // then when other peer will send this value also the server will be sure that both ends established channel
      this.sendSignalingMessage([checkChannelMessage]);
      //send checking message to peer
      this.send(roomName, JSON.stringify(checkChannelMessage), dataChannel);
      console.log("Checking message sent " + checkChannelMessage.value);
    }

    let room: Room = this.rooms.get(roomName);
    if (room && room.onOpenDataChannel) {
      room.onOpenDataChannel(peerId);
    }

    //request proof of identity - other party must respond by sending the data signed by its public key.
    //In request my party send own proof also.
    //For example, generate random data, sign it, send signed data to other party, the other party signs the data and sends it back
    let dataHex = converters.stringToHexString(randomString());
    if (!room["proofData"])
      room["proofData"] = {};
    room["proofData"][peerId] = dataHex;
    let signedData = this.sign(dataHex);
    let proofRequest = {type: P2PConnector.MSG_TYPE_REQUEST_PROOF_IDENTITY,
      signature: signedData.signatureHex, data: signedData.dataHex, publicKey: signedData.publicKeyHex};
    this.send(roomName, JSON.stringify(proofRequest), dataChannel);

    console.log(`Data channel is opened ${dataChannel.label}`);
  }

  onCloseDataChannel(roomName: string, peerId: string, dataChannel: RTCDataChannel) {
    console.log(`onCloseDataChannel ${roomName} ${peerId}`);
    let room: Room = this.rooms.get(roomName);

    room.getPeer(peerId).dataChannel = null;

    // if (dataChannels.length == 0)
    //   delete this.rooms[roomName];

    //commented out because websocket somewhy does not open on the next request
    // if (Object.keys(this.rooms).length == 0)
    //   if (this.signalingChannel)
    //     this.signalingChannel.close();

    if (room && room.onCloseDataChannel)
      room.onCloseDataChannel(peerId);
  }

  createDataChannel(room: string, peerId: string, peerConnection: RTCPeerConnection, role) {
    let dataChannel: RTCDataChannel;
    try {
      dataChannel = peerConnection.createDataChannel(room + ":" + peerId, null);  //caller do
    } catch (e) {
      console.log('error creating data channel ' + e);
      return;
    }
    this.initDataChannel(room, peerId, dataChannel);
  }

  onFailure(roomName: string, peerId: string, e) {
    let room: Room = this.rooms.get(roomName);
    if (room.onFailure)
      room.onFailure(peerId, e);
  }

  /**
   * offer example:
   * [
   * {"room":"1", "toPeerId":"93ac1cc5f78d3c54da74282dfb5012a2f29b5310b52bea5288f147f31a361419"},
   * {"type":"offer", "sdp":"v=0\r\no=- 199179691613427 ... webrtc-datachannel 1024\r\n"}
   * ]
   */
  doOffer(roomName: string, peerId: string) {
    console.log("do offer");
    let peerConnection = this.rooms.get(roomName).getPeer(peerId).peerConnection;
    this.createDataChannel(roomName, peerId, peerConnection, "caller");
    peerConnection.createOffer((offer) => {
        peerConnection.setLocalDescription(offer, () => {
          this.sendSignalingMessage([{room: roomName, "toPeerId": peerId}, peerConnection.localDescription]);
        }, (e) => this.onFailure(roomName, peerId, e));
      }, (e) => this.onFailure(roomName, peerId, e),
      null);
  }

  /**
   * answer example:
   * [
   * {"room":"1", "toPeerId":"12a26b3d6c17395f787166254b50259075fa0649ef0045ebd0c1555c4c5d8462"},
   * {"type":"answer", "sdp":"v=0\r\no=- 6490594091461 ... webrtc-datachannel 1024\r\n"}
   * ]
   */
  doAnswer(roomName: string, peerId: string) {
    console.log("do answer");
    let peerConnection = this.rooms.get(roomName).getPeer(peerId).peerConnection;
    peerConnection.createAnswer((answer) => {
      peerConnection.setLocalDescription(answer, () => {
        this.sendSignalingMessage([{room: roomName, toPeerId: peerId}, peerConnection.localDescription]);
      }, (e) => this.onFailure(roomName, peerId, e));
    }, (e) => this.onFailure(roomName, peerId, e));
  }

  // onChannelStateChange(dataChannel) {
  //   console.log('Data channel state is: ' + dataChannel.readyState);
  // }

  /**
   * Sends message to all online members of room.
   */
  sendMessage(roomName: string, message: P2PMessage) {
    return this.send(roomName, JSON.stringify(message));
  }

  private send(roomName: string, data, channel?: RTCDataChannel) {
    if (channel) {
      return this.sendInternal(channel, data);
    } else {
      let count = 0;
      if (roomName && this.rooms.get(roomName)) {
        this.rooms.get(roomName).getDataChannels().forEach(channel => count = count + this.sendInternal(channel, data));
      }
      return count;
    }
  }

  private sendInternal(channel: RTCDataChannel, data): number {
    let notSentReason;
    if (channel.readyState == "open") {
      try {
        channel.send(data);
        console.log(`>>> channel ${channel.label} \n ${data}`);
        return 1;
      } catch (e) {
        notSentReason = e.toString();
      }
    } else {
      notSentReason = "Channel state " + channel.readyState;
    }
    if (notSentReason) {
      console.log("Not sent: " + notSentReason);
    }
    return 0;
  }

  onMessage(roomName: string, peerId: string, dataChannel: RTCDataChannel, event: MessageEvent) {
    try {
      let msg = JSON.parse(event.data);

      let room: Room = this.rooms.get(roomName);
      if (room) {
        msg.fromPeerId = peerId;
        msg.roomName = roomName;
        room.onMessageInternal(msg);
      }
      console.log(`<<< channel ${dataChannel.label} \n ${event.data}`);
      if (msg.type === P2PConnector.MSG_TYPE_CHECK_CHANNEL) {
        this.sendSignalingMessage([{room: roomName}, msg]);
        //console.log("CHECK_CHANNEL " + msg.txt);
        //console.log("Checking message received (then sent to signaling server) " + msg.value);
      } else if (msg.type === P2PConnector.MSG_TYPE_REQUEST_PROOF_IDENTITY) {
        let signedData = this.sign(msg.data);
        let response = {type: P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY,
          signature: signedData.signatureHex, data: signedData.dataHex, publicKey: signedData.publicKeyHex};
        this.send(roomName, JSON.stringify(response), dataChannel);
      } else if (msg.type === P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY) {
        if (msg.rejected) {
          if (room.onRejected) {
            room.onRejected(peerId, msg.rejected);
          }
          console.log(`Peer ${peerId} rejected channel to him`);
          dataChannel.close();
          return;
        }
        let rejectedReason;
        if (room["proofData"][peerId] !== msg.data) {
          rejectedReason = "Received data does not match the sent data";
        } else if (msg.publicKey !== peerId) {
          rejectedReason = "Received public key does not match the peer's public key";
        } else if (room.memberPublicKeys.indexOf(msg.publicKey) == -1) {
          rejectedReason = "Received public key is not allowed";
        }
        if (rejectedReason) {
          let response = {type: P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY, rejected: rejectedReason};
          this.send(roomName, JSON.stringify(response), dataChannel);
          dataChannel.close();
          return;
        }
        if (heat.crypto.verifyBytes(msg.signature, msg.data, msg.publicKey)) {
          delete room["proofData"][peerId];
          console.log("PROOF_IDENTITY ok: \n" + msg.signature + " " +  msg.data + " " + msg.publicKey);
          if (!room.provenPublicKeyAllowed(room, peerId, msg.publicKey)) {
            let response = {type: P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY, rejected: "Public key owner is not allowed to connect"};
            this.send(roomName, JSON.stringify(response), dataChannel);
            dataChannel.close();
          }
        } else {
          let response = {type: P2PConnector.MSG_TYPE_REQUEST_PROOF_IDENTITY, rejected: "Invalid signature"};
          this.send(roomName, JSON.stringify(response), dataChannel);
          dataChannel.close();
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Close all data channels for the room, delete the room.
   */
  closeRoom(room: Room) {
    let dataChannels = room.getDataChannels();
    dataChannels.forEach(channel => channel.close());

    //room deleting is in the onCloseDataChannel()
  }

  /**
   * Clear all data. Close websocket of signaling channel.
   */
  close() {
    this.identity = null;
    this.pendingIdentity = null;
    this.pendingRooms = [];
    this.pendingOnlineStatus = null;
    this.rooms.forEach(room => this.closeRoom(room));
    if (this.signalingReady) {
      this.getWebSocket().then(socket => socket.close());
    }
  }


  private request(request: () => void, handleResponse: (msg) => any): Promise<any> {
    let p = new Promise<any>((resolve, reject) => {
      let f = (msg) => {
        let v = handleResponse(msg);
        if (v !== this.notAcceptedResponse) {
          resolve(v);
          let i: number = this.signalingMessageAwaitings.indexOf(f);
          if (i !== -1)
            this.signalingMessageAwaitings.splice(i, 1);
        }
      };
      this.signalingMessageAwaitings.push(f);
      return request();
    });
    return promiseTimeout(3000, p);
  }

}

function promiseTimeout(ms, promise) {
  return new Promise(function (resolve, reject) {
    // create a timeout to reject promise if not resolved
    var timer = setTimeout(function () {
      reject(new Error("promise timeout"));
    }, ms);

    promise
      .then(function (res) {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function randomString() {
  return Math.random().toString(36).substr(2);
}
