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

class Room {

  constructor(public name: string,
              private connector: P2PConnector) {

  }

  private peers: Map<string, RTCPeer> = new Map<string, RTCPeer>();

  /**
   * If room not exists registers the room on the server (signaling server).
   * Registers user in the room in the server.
   */
  enter() {
    this.connector.register(this);
  }

  /**
   * Sends message to all members of room (all peers in the room).
   */
  sendMessage(message: {}): number {
    return this.connector.sendMessage(this.name, message);
  }

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
  rejected: (byPeerId: string, reason: string) => any;

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
    let existingPeer = this.peers.get(peerId);
    if (existingPeer) {
      return existingPeer;
    }
    let p: RTCPeer = {publicKey: publicKey, dataChannel: null, peerConnection: null};
    this.peers.set(peerId, p);
    return p;
  }

  getAllPeers() {
    return this.peers;
  }

}

interface ProvingData {
  signatureHex: string,
  dataHex: string,
  publicKeyHex: string
}

interface RTCPeer {
  publicKey: string,
  peerConnection: RTCPeerConnection,
  dataChannel: RTCDataChannel
}

@Service('P2PConnector')
@Inject('settings')
class P2PConnector {

  private static MSG_TYPE_CHECK_CHANNEL = "CHECK_CHANNEL";
  private static MSG_TYPE_REQUEST_PROOF_IDENTITY = "GET_PROOF_IDENTITY";
  private static MSG_TYPE_RESPONSE_PROOF_IDENTITY = "PROOF_IDENTITY";

  private webSocketPromise: Promise<WebSocket>;
  private signalingMessageAwaitings: Function[] = [];
  private notAcceptedResponse = "notAcceptedResponse_@)(%$#&#&";

  private createRoom: (name: string) => Room;
  private allowCaller: (caller: string) => boolean;
  private sign: (dataHex: string) => ProvingData;
  private signalingError: (reason: string) => void;

  private pendingIdentity: string;
  private identity: string;
  private pendingToApproveRooms: Function[] = [];
  private pendingOnlineStatus: Function;
  private rooms: Map<string, Room> = new Map<string, Room>(); // roomName -> room
  private signalingChannelReady: boolean = null;
  private signalingChannel: WebSocket;
  private config = {iceServers: [{urls: 'stun:23.21.150.121'}, {urls: 'stun:stun.l.google.com:19302'}]};

  constructor(private settings: SettingsService) {

  }

  /**
   * @param identity
   * @param createRoom function to create the room on incoming call
   * @param allowCaller function to accept the caller
   * @param signalingError
   * @param sign Signing delegated to client class because this service class should not to have deal with secret info
   */
  setup(identity: string,
        createRoom: (name: string) => Room,
        allowCaller: (caller: string) => boolean,
        signalingError: (reason: string) => void,
        sign: (dataHex: string) => ProvingData) {
    this.pendingIdentity = identity;
    this.createRoom = createRoom;
    this.allowCaller = allowCaller;
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
    this.register(room);
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

  request(request: () => void, handleResponse: (msg) => any): Promise<any> {
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

  register(room: Room) {
    let approveRoom = () => {
      let existingRoom: Room = this.rooms.get(room.name);
      if (existingRoom) {
        if (existingRoom === room)
          return;
        this.closeRoom(existingRoom);
      }
      this.rooms.set(room.name, room);
    };

    if (this.identity) {
      approveRoom();
      this.sendSignalingMessage([{type: "ROOM", room: room.name}]);
    } else {
      this.sendSignalingMessage([{type: "WANT_PROVE_IDENTITY"}]);
      this.pendingToApproveRooms.push(approveRoom);
      return;
    }
  }

  /**
   * Resolves opened websocket.
   */
  getWebSocket() {
    if (!this.webSocketPromise || this.signalingChannelReady === false) {
      this.webSocketPromise = new Promise((resolve, reject) => {
          let url = this.settings.get(SettingsService.HEAT_WEBSOCKET);
          let socket = new WebSocket(url);
          console.log("new socket, readyState=" + socket.readyState);
          socket.onopen = () => {
            this.signalingChannel = socket;
            socket.onmessage = (msg) => this.onSignalingMessage(msg);
            socket.onclose = () => this.onSignalingChannelClosed();
            this.signalingChannelReady = true;
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

  onSignalingMessage(message) {
    let msg = JSON.parse(message.data);
    let roomName: string = msg.room;

    if (msg.type === 'PROVE_IDENTITY') {
      let signedData = this.sign(msg.data);
      signedData["type"] = P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY;
      this.sendSignalingMessage([signedData]);
    } else if (msg.type === 'APPROVED_IDENTITY') {
      this.identity = this.pendingIdentity;
      this.pendingToApproveRooms.forEach(f => f());
      this.pendingToApproveRooms = [];
      if (this.pendingOnlineStatus)
        this.pendingOnlineStatus();
      this.pendingOnlineStatus = null;
    } else if (msg.type === 'CALL') {
      let caller: string = msg.caller;
      if (this.allowCaller(caller)) {
        let room = this.createRoom(roomName);
        this.register(room);
      }
    } else if (msg.type === 'ERROR') {
      this.signalingError(msg.reason);
    } else if (msg.type === 'WELCOME') {  //welcome to existing room
      msg.remotePeerIds.forEach((peerId: string) => {
        let peer = this.rooms.get(roomName).createPeer(peerId, peerId);
        if (!peer.peerConnection) {
          this.createPeerConnection(roomName, peerId);
        }
        if (!peer.dataChannel || peer.dataChannel.readyState !== "open")
          this.doCall(roomName, peerId);
      });
    } else if (msg.type === 'offer') {
      let peerId: string = msg.fromPeer;
      let peer = this.rooms.get(roomName).createPeer(peerId, peerId);
      let pc = peer.peerConnection;
      if (!pc)
        pc = this.createPeerConnection(roomName, peerId);
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(msg));
        this.doAnswer(roomName, peerId);
        console.log("do answer");
      }
    } else if (msg.type === 'answer') {
      let pc = this.rooms.get(roomName).getPeer(msg.fromPeer).peerConnection;
      pc.setRemoteDescription(new RTCSessionDescription(msg));
      console.log("got answer");
    } else if (msg.type === 'candidate') {
      let pc = this.rooms.get(roomName).getPeer(msg.fromPeer).peerConnection;
      let candidate = new RTCIceCandidate({
        sdpMLineIndex: msg.label,
        candidate: msg.candidate
      });
      pc.addIceCandidate(candidate);
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
    this.signalingChannelReady = false;

    //will force authentication the next time the socket is opened
    this.pendingIdentity = this.identity;
    this.identity = null;
  }

  sendSignalingMessage(message: any[]): Promise<any> {
    return this.getWebSocket().then(websocket => {
      message.splice(0, 0, "webrtc");
      let msgString = JSON.stringify(message);
      websocket.send(msgString);
    }, reason => console.log(reason))
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
            //this.onCloseDataChannel(roomName, peerId, peer.dataChannel);
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
    if (room && room.onOpenDataChannel)
      room.onOpenDataChannel(peerId);

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

  doCall(roomName: string, peerId: string) {
    console.log("do call");
    let peerConnection = this.rooms.get(roomName).getPeer(peerId).peerConnection;
    this.createDataChannel(roomName, peerId, peerConnection, "caller");
    peerConnection.createOffer((offer) => {
        peerConnection.setLocalDescription(offer, () => {
          this.sendSignalingMessage([{room: roomName, "toPeerId": peerId}, peerConnection.localDescription]);
        }, (e) => this.onFailure(roomName, peerId, e));
      }, (e) => this.onFailure(roomName, peerId, e),
      null);
  }

  doAnswer(roomName: string, peerId: string) {
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
  sendMessage(roomName: string, message: {}) {
    return this.send(roomName, JSON.stringify(message));
  }

  send(roomName: string, data, channel?: RTCDataChannel) {
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
    if (channel.readyState == "open") {
      channel.send(data);
      return 1;
    }
    console.log("not sent. channel state=");
  }

  onMessage(roomName: string, peerId: string, dataChannel: RTCDataChannel, event: MessageEvent) {
    try {
      let msg = JSON.parse(event.data);

      let room: Room = this.rooms.get(roomName);
      if (room && room.onMessage) {
        msg.fromPeerId = peerId;
        msg.roomName = roomName;
        room.onMessage(msg);
      }
      if (msg.type === P2PConnector.MSG_TYPE_CHECK_CHANNEL) {
        this.sendSignalingMessage([{room: roomName}, msg]);
        console.log("CHECK_CHANNEL " + msg.txt);
        console.log("Checking message received (then sent to signaling server) " + msg.value);
      } else if (msg.type === P2PConnector.MSG_TYPE_REQUEST_PROOF_IDENTITY) {
        let signedData = this.sign(msg.data);
        let response = {type: P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY,
          signature: signedData.signatureHex, data: signedData.dataHex, publicKey: signedData.publicKeyHex};
        this.send(roomName, JSON.stringify(response), dataChannel);
      } else if (msg.type === P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY) {
        if (msg.rejected) {
          room.rejected(peerId, msg.rejected);
          return;
        }
        if (room["proofData"][peerId] !== msg.data) {
          let response = {type: P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY, rejected: "Received data does not match the sent data"};
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
    this.pendingToApproveRooms = [];
    this.pendingOnlineStatus = null;
    this.rooms.forEach(room => this.closeRoom(room));
    if (this.signalingChannel)
      this.signalingChannel.close();
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
