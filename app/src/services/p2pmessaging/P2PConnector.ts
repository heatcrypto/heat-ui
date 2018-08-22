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
   * On failure callback.
   */
  onCloseDataChannel: (peerId: string) => any;

}

@Service('P2PConnector')
@Inject('settings')
class P2PConnector {

  initiator;
  webSocketPromise: Promise<WebSocket>;

  rooms = {}; //structure {room: {dataChannels: []}, {remotePeerId: RTCPeerConnection}, ...}
  signalingChannelReady: boolean = false;
  signalingChannel: WebSocket;
  config = {iceServers: [{urls: 'stun:23.21.150.121'}, {urls: 'stun:stun.l.google.com:19302'}]};

  constructor(private settings: SettingsService) {

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
  getWebSocket(url: string) {
    if (!this.webSocketPromise) {
      this.webSocketPromise = new Promise((resolve, reject) => {
          let socket = new WebSocket(url);
          console.log("socket" + socket);
          socket.onopen = () => {
            console.log("connected");
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
      this.sendSignalingMessage(["webrtc", roomName, {"type": "ROOM"}])
    };
    if (this.signalingChannelReady) {
      sendRoom();
      return;
    }
    this.signalingChannelReady = false;
    this.getWebSocket(this.settings.get(SettingsService.HEAT_WEBSOCKET)).then(websocket => {
      this.signalingChannel = websocket;
      sendRoom();
      this.initiator = false;
      this.signalingChannelReady = true;
      this.signalingChannel.onmessage = (msg) => this.onSignalingMessage(msg);
      this.signalingChannel.onclose = () => this.onSignalingChannelClosed();
    }, reason => console.log(reason))
  }

  // onSignalingChannelOpened(r) {
  //   this.signalingChannelReady = true;
  //   //createPeerConnection();
  //   //this.sendSignalingMessage(["webrtc", this.room, {"type": "ROOM"}]);
  //   this.initiator = false;
  // }

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
      let peerId = msg.fromPeer;
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
    }
  }

  onSignalingChannelClosed() {
    this.signalingChannelReady = false;
  }

  sendSignalingMessage(message) {
    let msgString = JSON.stringify(message);
    this.signalingChannel.send(msgString);
    //printState("Sent " + msgString);
  }

  createPeerConnection(room: string, peerId) {
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection(this.config);
      pc.onicecandidate = (event) => {
        if (event.candidate)
          this.sendSignalingMessage(["webrtc", room, peerId, {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
          }]);
      };
      pc.ondatachannel = (event) => {
        let dataChannel = event.channel;
        console.log('Received data channel creating request');  //calee do
        this.initDataChannel(room, peerId, dataChannel, true);
        console.log("init Data Channel");
      };

      this.rooms[room][peerId] = pc;

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

  onOpenDataChannel(room: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
    if (sendCheckingMessage) {
      let checkChannelMessage = {"type": "CHECK_CHANNEL", "value": ("" + Math.random())};
      //send checking message to signaling server,
      // then when other peer will send this value also the server will be sure that both ends established channel
      this.sendSignalingMessage(["webrtc", room, peerId, checkChannelMessage]);
      //send checking message to peer
      this.sendMessage(room, JSON.stringify(checkChannelMessage), dataChannel);
      console.log("Checking message sent " + checkChannelMessage.value);
    }
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
    room.onFailure(roomName, e);
  }

  doCall(roomName: string, peerId: string) {
    let peerConnection = this.rooms[roomName][peerId];
    this.createDataChannel(roomName, peerId, peerConnection, "caller");
    peerConnection.createOffer((offer) => {
        peerConnection.setLocalDescription(offer, () => {
          this.sendSignalingMessage(["webrtc", roomName, peerId, peerConnection.localDescription]);
        }, (e) => this.onFailure(roomName, peerId, e));
      }, (e) => this.onFailure(roomName, peerId, e),
      null);
  }

  doAnswer(roomName: string, peerId: string) {
    let peerConnection = this.rooms[roomName][peerId];
    peerConnection.createAnswer((answer) => {
      peerConnection.setLocalDescription(answer, () => {
        this.sendSignalingMessage(["webrtc", roomName, peerId, peerConnection.localDescription]);
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
      room.onMessage(peerId, event.data);

      let msg = JSON.parse(event.data);

      if (msg.type === 'chatmessage') {
        console.log("chatmessage " + msg.txt);
      } else if (msg.type === 'CHECK_CHANNEL') {
        this.sendSignalingMessage(["webrtc", roomName, msg]);
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
