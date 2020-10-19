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

  export class NoProtocol extends MessagingProtocol {

    get name(): p2p.ProtocolName {
      return ""
    }

    readonly handlers = Object.assign(this.baseHandlers, {
      PONG: (roomName: string, msg) => {

      },

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

    })
  }
}
