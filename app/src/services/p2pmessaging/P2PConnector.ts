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

class Room {

  constructor(public name: string,
              private connector: P2PConnector) {

  }

  /**
   * Registers room and member (caller) on the server side (in the signaling server).
   */
  enter() {
    this.connector.room(this);
  }

  /**
   * Sends message to all members of room (all peers in the room).
   */
  sendMessage(message: {}) {
    this.connector.sendMessage(this.name, message);
  }

  /**
   * On receiving message callback.
   */
  onMessage: (msg: {}) => any;

  /**
   * On failure callback.
   */
  onFailure: (room: string, e: any) => any;

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
}

interface ProvingData {
  signatureHex: string,
  dataHex: string,
  publicKeyHex: string
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
  private pendingRoom: Function[] = [];
  private rooms = {}; //structure {room: {dataChannels: []}, {remotePeerId: RTCPeerConnection}, ...}
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

  call(toPeerId: string, caller: string, room: Room) {
    this.room(room);
    this.sendSignalingMessage([{"type": "CALL", "toPeerId": toPeerId, "caller": caller, "room": room.name}]);
  }

  /**
   * Sets online status on the server side for the peer associated with this connector (websocket connection for signaling).
   * "0" - offline, "1" - online
   */
  setOnlineStatus(status: string) {
    this.sendSignalingMessage([{"type": "SET_ONLINE_STATUS", "status": status}]);
  }

  getOnlineStatus(peerId: string): Promise<string> {
    return this.request(
      () => this.sendSignalingMessage([{"type": "GET_ONLINE_STATUS", "peerId": peerId}]),
      (msg) => {
        if (msg.type === "ONLINE_STATUS" && msg.peerId == peerId)
          return msg.status;
        return this.notAcceptedResponse;
      })
  }

  getTmp(roomName: string): Promise<Array<string>> {
    return this.request(
      () => this.sendSignalingMessage([{"type": "WHO_ONLINE"}]),
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
      this.getWebSocket().then(websocket => {
        request();
      }, reason => console.log(reason))
    });
    return promiseTimeout(3000, p);
  }

  room(room: Room) {
    let approveRoom = () => {
      if (this.rooms[room.name]) {
        let existingRoom: Room = this.rooms[room.name]["room"];
        if (existingRoom) {
          if (existingRoom === room)
            return;
          this.closeRoom(existingRoom.name);
        }
      }
      this.rooms[room.name] = {};
      this.rooms[room.name]["dataChannels"] = [];
      this.rooms[room.name]["room"] = room;
    };

    if (this.identity) {
      approveRoom();
      this.sendSignalingMessage([{"type": "ROOM", "room": room.name}]);
    } else {
      this.sendSignalingMessage([{type: "WANT_PROVE_IDENTITY"}]);
      this.pendingRoom.push(approveRoom);
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
          console.log("socket" + socket);
          socket.onopen = () => {
            this.signalingChannel = socket;
            socket.onmessage = (msg) => this.onSignalingMessage(msg);
            socket.onclose = () => this.onSignalingChannelClosed();
            this.signalingChannelReady = true;
            resolve(socket);
          };
          socket.onerror = (error) => {
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
      this.pendingRoom.forEach(f => f());
    } else if (msg.type === 'CALL') {
      let caller: string = msg.caller;
      if (this.allowCaller(caller)) {
        let room = this.createRoom(roomName);
        this.room(room);
      }
    } else if (msg.type === 'ERROR') {
      this.signalingError(msg.reason);
    } else if (msg.type === 'WELCOME') {  //welcome to existing room
      msg.remotePeerIds.forEach((peerId: string) => {
        if (!this.rooms[roomName][peerId]) {
          let pc = this.createPeerConnection(roomName, peerId);
          if (pc)
            this.doCall(roomName, peerId);
        }
      });
      console.log("do call");
    } else if (msg.type === 'offer') {
      let peerId: string = msg.fromPeer;
      let pc = this.rooms[roomName][peerId];
      if (!pc)
        pc = this.createPeerConnection(roomName, peerId);
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(msg));
        this.doAnswer(roomName, peerId);
        console.log("do answer");
      }
    } else if (msg.type === 'answer') {
      let pc = this.rooms[roomName][msg.fromPeer];
      pc.setRemoteDescription(new RTCSessionDescription(msg));
      console.log("got answer");
    } else if (msg.type === 'candidate') {
      let pc = this.rooms[roomName][msg.fromPeer];
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
  }

  sendSignalingMessage(message: any[]) {
    this.getWebSocket().then(websocket => {
      message.splice(0, 0, "webrtc");
      let msgString = JSON.stringify(message);
      this.signalingChannel.send(msgString);
    }, reason => console.log(reason))
  }

  createPeerConnection(roomName: string, peerId: string) {
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(this.config);
      pc.onicecandidate = (event) => {
        if (event.candidate)
          this.sendSignalingMessage([{"room": roomName, "toPeerId": peerId}, {
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
      };

      this.rooms[roomName][peerId] = pc;

      return pc;
    } catch (e) {
      console.log(e);
      pc = null;
      return;
    }
  }

  initDataChannel(room: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
    //this.rooms[room][]
    dataChannel.onopen = () => this.onOpenDataChannel(room, peerId, dataChannel, sendCheckingMessage);
    dataChannel.onclose = () => this.onCloseDataChannel(room, peerId, dataChannel);
    dataChannel.onmessage = (event) => this.onMessage(room, peerId, dataChannel, event);
    this.rooms[room]["dataChannels"].push(dataChannel);
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

    let room: Room = this.rooms[roomName]["room"];
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

    console.log("Data channel is opened");
  }

  onCloseDataChannel(roomName: string, peerId: string, dataChannel: RTCDataChannel) {
    let room: Room = this.rooms[roomName]["room"];

    let dataChannels = this.rooms[roomName]["dataChannels"];
    let i: number = dataChannels.indexOf(dataChannel);
    if (i !== -1)
      dataChannels.splice(i, 1);
    if (dataChannels.length == 0)
      delete this.rooms[roomName];
    if (Object.keys(this.rooms).length == 0)
      if (this.signalingChannel)
        this.signalingChannel.close();

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
    let room: Room = this.rooms[roomName]["room"];
    if (room.onFailure)
      room.onFailure(roomName, e);
  }

  doCall(roomName: string, peerId: string) {
    let peerConnection = this.rooms[roomName][peerId];
    this.createDataChannel(roomName, peerId, peerConnection, "caller");
    peerConnection.createOffer((offer) => {
        peerConnection.setLocalDescription(offer, () => {
          this.sendSignalingMessage([{"room": roomName, "toPeerId": peerId}, peerConnection.localDescription]);
        }, (e) => this.onFailure(roomName, peerId, e));
      }, (e) => this.onFailure(roomName, peerId, e),
      null);
  }

  doAnswer(roomName: string, peerId: string) {
    let peerConnection = this.rooms[roomName][peerId];
    peerConnection.createAnswer((answer) => {
      peerConnection.setLocalDescription(answer, () => {
        this.sendSignalingMessage([{"room": roomName, "toPeerId": peerId}, peerConnection.localDescription]);
      }, (e) => this.onFailure(roomName, peerId, e));
    }, (e) => this.onFailure(roomName, peerId, e));
  }

  // onChannelStateChange(dataChannel) {
  //   console.log('Data channel state is: ' + dataChannel.readyState);
  // }

  /**
   * Sends message to all online members of room.
   */
  sendMessage(room: string, message: {}) {
    this.send(room, JSON.stringify(message));
  }

  send(room: string, data, channel?: RTCDataChannel) {
    if (channel) {
      channel.send(data);
    } else {
      if (room && this.rooms[room]) {
        let dataChannels: RTCDataChannel[] = this.rooms[room]["dataChannels"];
        if (dataChannels)
          dataChannels.forEach(function (channel) {
            channel.send(data);
          });
      }
    }
  }

  onMessage(roomName: string, peerId: string, dataChannel: RTCDataChannel, event: MessageEvent) {
    try {
      let msg = JSON.parse(event.data);

      let room: Room = this.rooms[roomName]["room"];
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
  closeRoom(roomName: string) {
    let dataChannels: RTCDataChannel[] = this.rooms[roomName]["dataChannels"];
    dataChannels.forEach(channel => channel.close());
    dataChannels.length = 0;
    //room deleting is in the onCloseDataChannel()
  }

  close() {
    this.identity = null;
    this.pendingIdentity = null;
    for (let roomName in this.rooms) {
      this.closeRoom(roomName);
    }
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
