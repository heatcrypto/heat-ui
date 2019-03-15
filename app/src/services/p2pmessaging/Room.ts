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

module p2p {

  /**
   * Room it is the way to connect peers. When two peers (client apps) will create the room object with the same name
   * they will get the WebRTC channel between each other (if signaling happened succesfully).
   * The room property peers may no contains entry of peer until the peer enter the room in his application.
   */
  export class Room {

    constructor(public name: string,
                private connector: P2PConnector,
                private storage: StorageService,
                private user: UserService,
                public memberPublicKeys: string[]) {
    }

    state: {approved: boolean, entered: EnterRoomState} = {
      approved: false,
      entered: "not"
    };

    lastIncomingMessageTimestamp: number = 0;

    private peers: Map<string, RTCPeer> = new Map<string, RTCPeer>();
    private messageHistory: MessageHistory;

    /**
     * If room not exists registers the room on the server (signaling server).
     * Registers user in the room on the server.
     */
    enter(enforce?: boolean) {
      this.connector.enter(this, enforce);
      return this;
    }

    /**
     * Sends message to all members of room (all peers in the room).
     * Returns count of peers to which message sent.
     */
    sendMessage(message: P2PMessage): number {
      let count = this.connector.sendMessage(this.name, message);
      if (message.type == "chat") {
        let item = {timestamp: message.timestamp, fromPeer: this.user.publicKey, content: message.text};
        this.getMessageHistory().put(item);
        if (this.onNewMessageHistoryItem) {
          this.onNewMessageHistoryItem(item);
        }
      }
      return count;
    }

    onMessageInternal(msg: any) {
      if (msg.type == "chat") {
        let item: MessageHistoryItem = {timestamp: msg.timestamp, fromPeer: msg.fromPeerId, content: msg.text};
        this.getMessageHistory().put(item);
        if (this.onNewMessageHistoryItem) {
          this.onNewMessageHistoryItem(item);
        }
        this.lastIncomingMessageTimestamp = Date.now();
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

  export interface P2PMessage {
    timestamp: number,
    type: "chat" | "",
    text: string
  }

  export class RTCPeer {
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

  export interface ProvingData {
    signatureHex: string,
    dataHex: string,
    publicKeyHex: string
  }

}
