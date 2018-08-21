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

module heat.webrtc {

  export interface Room {
    onMessage(message: string)
  }

  export class Connector {

    roomX: Room;

    //room: string[];
    initiator;
    websocketPromise: Promise<WebSocket>;
    signalingURL: string;

    rooms = {}; //{room: {remotePeerId: RTCPeerConnection, ...}, ...}
    //connections = {}; //{remotePeerId: RTCPeerConnection, ...}
    //dataChannels = [];
    signalingChannelReady: boolean = false;
    signalingChannel: WebSocket;
    // config = {
    //   "iceServers": [{url: 'stun:23.21.150.121'}, {url: 'stun:stun.l.google.com:19302'}]
    // };
    config = {iceServers: [{urls: 'stun:23.21.150.121'}, {urls: 'stun:stun.l.google.com:19302'}]};

    initWebRTC(signalingURL, peer1: string, peer2: string) {
      let room = peer2 > peer1 ? peer1 + peer2 : peer2 + peer1; //stub
      if (!this.rooms[room]) {
        this.signalingURL = signalingURL;
        this.rooms[room] = {};
        this.rooms[room]["dataChannels"] = [];
        this.openSignalingChannel(room);
      }
    }

    /**
     * Resolves opened websocket.
     */
    getWebSocket(url: string) {
      if (!this.websocketPromise) {
        this.websocketPromise = new Promise((resolve, reject) => {
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
      return this.websocketPromise;
    }

    openSignalingChannel(room: string) {
      let sendRoom = () => {
        this.sendSignalingMessage(["webrtc", room, {"type": "ROOM"}])
      };
      if (this.signalingChannelReady) {
        sendRoom();
        return;
      }
      this.signalingChannelReady = false;
      this.getWebSocket(this.signalingURL).then(websocket => {
        this.signalingChannel = websocket;
        sendRoom();
        this.initiator = false;
        this.signalingChannelReady = true;
        this.signalingChannel.onmessage = (msg) => this.onSignalingMessage(msg);
        this.signalingChannel.onclose = () => this.onSignalingChannelClosed();
      })
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

        // let s = '';
        // for(key in connections)
        //   s += (key + ' = ' + connections[key] + ';  ');
        // printState("connections: " + s);
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
      dataChannel.onclose = () => this.onCloseDataChannel(room, dataChannel);
      dataChannel.onmessage = (event) => this.onMessage(room, peerId, event);
      this.rooms[room]["dataChannels"].push(dataChannel);
    }

    onOpenDataChannel(room: string, peerId: string, dataChannel: RTCDataChannel, sendCheckingMessage?: boolean) {
      if (sendCheckingMessage) {
        let checkChannelMessage = {"type": "CHECK_CHANNEL", "uuid": ("" + this.uuidv4())};
        //send checking message to signaling server,
        // then when other peer will send this uuid also the server will be sure that both ends established channel
        this.sendSignalingMessage(["webrtc", room, peerId, checkChannelMessage]);
        //send checking message to peer
        this.sendMessage(room, JSON.stringify(checkChannelMessage), dataChannel);
        console.log("Checking message sent " + checkChannelMessage.uuid);
      }
      console.log("Data channel is opened");
    }

    onCloseDataChannel(room: string, dataChannel: RTCDataChannel) {
      let dataChannels = this.rooms[room]["dataChannels"];
      let i: number = dataChannels.indexOf(dataChannel);
      if (i !== -1)
        dataChannels.splice(i, 1);
      if (dataChannels.length == 0)
        delete this.rooms[room];
      if (Object.keys(this.rooms).length == 0)
        if (this.signalingChannel)
          this.signalingChannel.close();
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

    failureCallback(e) {
      console.log("failure callback " + e.message);
    }

    doCall(room: string, toPeerId: string) {
      let peerConnection = this.rooms[room][toPeerId];
      this.createDataChannel(room, toPeerId, peerConnection, "caller");
      peerConnection.createOffer((offer) => {
        peerConnection.setLocalDescription(offer, () => {
          this.sendSignalingMessage(["webrtc", room, toPeerId, peerConnection.localDescription]);
        }, this.failureCallback);
      }, this.failureCallback, null);
    }

    doAnswer(room, peerId) {
      let peerConnection = this.rooms[room][peerId];
      peerConnection.createAnswer((answer) => {
        peerConnection.setLocalDescription(answer, () => {
          this.sendSignalingMessage(["webrtc", room, peerId, peerConnection.localDescription]);
        }, this.failureCallback);
      }, this.failureCallback);
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

    onMessage(room: string, peerId: string, event: MessageEvent) {
      console.log(event.target);
      //let dataChannelLabel: string = event.channel.label;
      //let room = dataChannelLabel.substr(0, dataChannelLabel.lastIndexOf(":"));
      try {
        let msg = JSON.parse(event.data);
        if (msg.type === 'chatmessage') {
          this.roomX.onMessage(msg.txt);
          console.log("chatmessage " + msg.txt);
        } else if (msg.type === 'CHECK_CHANNEL') {
          this.sendSignalingMessage(["webrtc", room, msg]);
          console.log("CHECK_CHANNEL " + msg.txt);
          console.log("Checking message received (then sent to signaling server) " + msg.uuid);
        }
      } catch (e) {
        console.log(e);
      }
    }

    uuidv4() {
      return "qqq-www-eee"
      // return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      //   (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      // )
    }

  }

  export var connector = new heat.webrtc.Connector();

}
