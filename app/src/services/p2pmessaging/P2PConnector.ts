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
   * Sends message to all members of room.
   */
  sendMessage(message: string) {
    this.connector.sendMessage(this.name, message);
  }

  /**
   * On receiving message callback.
   */
  onMessage: (fromPeerId: string, data: any) => any;

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

}

@Service('P2PConnector')
@Inject('settings')
class P2PConnector {

  initiator;
  webSocketPromise: Promise<WebSocket>;
  signalingMessageAwaitings: Function[] = [];
  notAcceptedResponse = "notAcceptedResponse_@)(%$#&#&";

  rooms = {}; //structure {room: {dataChannels: []}, {remotePeerId: RTCPeerConnection}, ...}
  signalingChannelReady: boolean = false;
  signalingChannel: WebSocket;
  config = {iceServers: [{urls: 'stun:23.21.150.121'}, {urls: 'stun:stun.l.google.com:19302'}]};

  constructor(private settings: SettingsService) {

  }

  /**
   * Sets online status on the server side for the peer associated with this connector (websocket connection for signaling).
   * "0" - offline, "1" - online
   */
  setOnlineStatus(status: string) {
    this.getWebSocket().then(websocket => {
      this.sendSignalingMessage([{"type": "SET_ONLINE_STATUS", "status": status}]);
    }, reason => console.log(reason))
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
    if (!this.rooms[room.name]) {
      this.rooms[room.name] = {};
      this.rooms[room.name]["dataChannels"] = [];
      this.rooms[room.name]["room"] = room;
      this.openSignalingChannel(room.name);
    }
  }

  /**
   * Resolves opened websocket.
   */
  getWebSocket() {
    if (!this.signalingChannelReady) {
      this.webSocketPromise = new Promise((resolve, reject) => {
          let url = this.settings.get(SettingsService.HEAT_WEBSOCKET);
          let socket = new WebSocket(url);
          console.log("socket" + socket);
          socket.onopen = () => {
            this.signalingChannel = socket;
            this.signalingChannel.onmessage = (msg) => this.onSignalingMessage(msg);
            this.signalingChannel.onclose = () => this.onSignalingChannelClosed();
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

  openSignalingChannel(roomName: string) {
    let sendRoom = () => {
      this.sendSignalingMessage([{"type": "ROOM", "room": roomName}])
    };
    if (this.signalingChannelReady) {
      sendRoom();
      return;
    }
    this.getWebSocket().then(websocket => {
      sendRoom();
      this.initiator = false;
    }, reason => console.log(reason))
  }

  onSignalingMessage(message) {
    let msg = JSON.parse(message.data);
    let room: string = msg.room;
    if (msg.type === 'WELCOME') {
      this.initiator = true;
      msg.remotePeerIds.forEach((peerId: string) => {
        if (!this.rooms[room][peerId]) {
          let pc = this.createPeerConnection(room, peerId);
          if (pc)
            this.doCall(room, peerId);
        }
      });
      // doCall();
      console.log("do call");
    } else if (msg.type === 'offer') {
      let peerId: string = msg.fromPeer;
      let pc = this.rooms[room][peerId];
      if (!pc)
        pc = this.createPeerConnection(room, peerId);
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(msg));
        this.doAnswer(room, peerId);
        console.log("do answer");
      }
    } else if (msg.type === 'answer') {
      let pc = this.rooms[room][msg.fromPeer];
      pc.setRemoteDescription(new RTCSessionDescription(msg));
      console.log("got answer");
    } else if (msg.type === 'candidate') {
      let pc = this.rooms[room][msg.fromPeer];
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
    message.splice(0, 0, "webrtc");
    let msgString = JSON.stringify(message);
    this.signalingChannel.send(msgString);
    //printState("Sent " + msgString);
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
    dataChannel.onmessage = (event) => this.onMessage(room, peerId, event);
    this.rooms[room]["dataChannels"].push(dataChannel);
  }

  onOpenDataChannel(roomName: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
    if (sendCheckingMessage) {
      let checkChannelMessage = {"type": "CHECK_CHANNEL", "room": roomName, "value": ("" + Math.random())};
      //send checking message to signaling server,
      // then when other peer will send this value also the server will be sure that both ends established channel
      this.sendSignalingMessage([checkChannelMessage]);
      //send checking message to peer
      this.sendMessage(roomName, JSON.stringify(checkChannelMessage), dataChannel);
      console.log("Checking message sent " + checkChannelMessage.value);
    }

    let room: Room = this.rooms[roomName]["room"];
    if (room && room.onOpenDataChannel)
      room.onOpenDataChannel(peerId);

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

  sendMessage(room: string, data, channel?: RTCDataChannel) {
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

  onMessage(roomName: string, peerId: string, event: MessageEvent) {
    console.log(event.target);
    //let dataChannelLabel: string = event.channel.label;
    //let room = dataChannelLabel.substr(0, dataChannelLabel.lastIndexOf(":"));
    try {
      let room: Room = this.rooms[roomName]["room"];
      if (room.onMessage)
        room.onMessage(peerId, event.data);

      let msg = JSON.parse(event.data);

      if (msg.type === 'chatmessage') {
        console.log("chatmessage " + msg.txt);
      } else if (msg.type === 'CHECK_CHANNEL') {
        this.sendSignalingMessage([{"room": roomName}, msg]);
        console.log("CHECK_CHANNEL " + msg.txt);
        console.log("Checking message received (then sent to signaling server) " + msg.value);
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
