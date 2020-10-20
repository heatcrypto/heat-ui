/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Heat Ledger Ltd.
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

module p2p {

  export class SignalingProtocol extends BaseProtocol {

    get name(): p2p.ProtocolName {
      return "webrtc"
    }

    readonly handlers = Object.assign(this.baseHandlers, {

      PROVE_IDENTITY: (roomName: string, msg) => {
        let signedData = this.connector.sign(msg.data);
        signedData["type"] = P2PConnector.MSG_TYPE_RESPONSE_PROOF_IDENTITY;
        this.connector.sendWebsocketMessage("webrtc", [signedData]);
      },

      APPROVED_IDENTITY: (roomName: string, msg) => {
        this.connector.identity = this.connector.accountPublicKey;
        this.connector.pendingRooms.forEach(f => f());
        this.connector.pendingRooms = [];
        if (this.connector.pendingOnlineStatus)
          this.connector.pendingOnlineStatus();
        this.connector.pendingOnlineStatus = null;
      },

      WELCOME: (roomName: string, msg) => {
        let room = this.connector.rooms.get(roomName);
        room.state.entered = "entered";
        msg.remotePeerIds.forEach((peerId: string) => {
          let peer = room.createPeer(peerId, peerId);
          if (peer && !peer.isConnected()) {
            let pc = this.connector.askPeerConnection(roomName, peerId);
            this.connector.doOffer(roomName, peerId, pc);
          }
        });
      },

      CALL: (roomName: string, msg) => {
        let caller: string = msg.caller;
        this.connector.confirmIncomingCall(caller).then(value => {
          let room = this.connector.createRoom(roomName, caller);
          this.connector.enter(room, true);
        });
      },

      offer: (roomName: string, msg) => {
        let peerId: string = msg.fromPeer;
        let peer = this.connector.rooms.get(roomName).createPeer(peerId, peerId);
        if (peer && !peer.isConnected()) {
          let room = this.connector.rooms.get(roomName);
          let pc = this.connector.askPeerConnection(roomName, peerId);
          if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(msg))
              .then(() => {
                this.connector.doAnswer(roomName, peerId, pc);
              })
              .catch(e => {
                if (room.onFailure) {
                  room.onFailure(peerId, e);
                } else {
                  console.log(e.name + "  " + e.message);
                }
              });
          }
        }
      },

      answer: (roomName: string, msg) => {
        let room = this.connector.rooms.get(roomName);
        let peer = room.getPeer(msg.fromPeer);
        if (peer && !peer.isConnected()) {
          let pc = peer.peerConnection;
          if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(msg))
              .catch(e => {
                if (room.onFailure) {
                  room.onFailure(msg.fromPeer, e);
                } else {
                  console.log(e.name + "  " + e.message);
                }
              });
          }
        }
      },

      candidate: (roomName: string, msg) => {
        let room = this.connector.rooms.get(roomName);
        let peer = room.getPeer(msg.fromPeer);
        let pc = peer.peerConnection;
        let candidate = new RTCIceCandidate({
          sdpMLineIndex: msg.label,
          candidate: msg.candidate
        });
        pc.addIceCandidate(candidate)
          .catch(e => {
            console.log("Failure during addIceCandidate(): " + e.name + "  " + e.message);
            if (room.onFailure) {
              room.onFailure(msg.fromPeer, e);
            }
          });

        //hack
        if (!peer['noNeedReconnect']) {
          setTimeout(() => {
            if (!peer.isConnected() && peer['connectionRole'] == "answer") {
              peer['noNeedReconnect'] = true;
              let pc = this.connector.askPeerConnection(roomName, msg.fromPeer);
              this.connector.doOffer(roomName, msg.fromPeer, pc);
            }
          }, 2500);
        }
      },

      WRONGROOM: (roomName: string, msg) => {
        //window.location.href = "/";
        console.log(`Wrong room name "${roomName}"`);
      },

    })
  }
}
