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

  const MESSAGE_TEXT_MAX_SIZE = 8000

  /**
   * Messages of this type are stored on the server, then they are sent to the recipients when recipient will be online
   */
  export class U2UMessage {
    id?: string
    type: MessageType
    timestamp: number
    text: string
    data?: any
    fromPeerId?: string
    roomName?: string
    //Message can be transported via blockchain or via p2p (webrtc) or via node. Set the value when a message is received
    transport?: TransportType
    ready: Promise<void>

    constructor(type: MessageType, timestamp: number, text?: string, file?: File) {
      this.type = type;
      this.timestamp = timestamp;

      if (file) {
        this.ready = file.arrayBuffer().then(buffer => {
          /*
          //header format:  0: header length  1: file size in bytes  2: file name
          let fileNameBuffer = converters.stringToArrayBuffer(file.name)
          let headerLength = 4 + 4 + fileNameBuffer.byteLength
          let header = converters.concatenate(
            new Uint32Array([headerLength, file.size]).buffer,
            fileNameBuffer
          )
          let messageContentBuffer = converters.concatenate(header, buffer)
          this.text = converters.arrayBufferToString(messageContentBuffer)
          */
          this.data = buffer
          this.text = `${file.size} | ${file.name}`
        })
      } else {
        if (text?.length > MESSAGE_TEXT_MAX_SIZE) {
          throw new Error(`Text length ${text.length} is too big, the length is limited to ${MESSAGE_TEXT_MAX_SIZE}`)
        }
        this.ready = Promise.resolve()
      }

      this.text = text;
      this.id = utils.uuidv4()
    }
  }

  export interface ProvingData {
    signatureHex: string,
    dataHex: string,
    publicKeyHex: string
  }

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
    sendMessage(message: U2UMessage): Promise<number> {
      return message.ready.then(value => {
        let result = this.connector.sendMessage(this.name, message);
        this.registerInHistory(true, message, result)
        return result.count;
      })
    }

    sendFiles(files?: File[]) {
      for (const file of files) {
        if (file.size > 0) this.sendMessage(new p2p.U2UMessage("file", Date.now(), null, file))
      }
    }

    registerInHistory(sending: boolean, message, sendResult?) {
      if (!(message.type == "chat" || message.type == "file")) return
      if (this.getMessageHistory().isExistingId(message.id)) {
        throw new Error("Received a message with a duplicate ID (previously there was a message with the same ID)");
      }
      let item: MessageHistoryItem = {
        msgId: message.id,
        type: message.type,
        timestamp: message.timestamp,
        receiptTimestamp: Date.now(),
        fromPeer: sending ? this.user.publicKey : message.fromPeerId,
        content: message.text,
        transport: sending ? sendResult.transport : message.transport
      };
      this.getMessageHistory().put(item);
      if (sending && message.transport == "p2p" && sendResult.count > 0) {
        //webrtc message is sent, it means the channel is opened, it means that delivered
        setTimeout(() => this.getMessageHistory().putExtraInfo(message.id, {status: {stage: 1}}), 100)
      }
      if (this.onNewMessageHistoryItem) {
        this.onNewMessageHistoryItem(item);
      }
    }

    onMessageInternal(message: U2UMessage) {
      if (this.getMessageHistory().isExistingId(message.id)) {
        throw new Error("Received a message with a duplicate ID (previously there was a message with the same ID)");
      }
      this.registerInHistory(false, message)
      if (message.type == "chat") {
        this.lastIncomingMessageTimestamp = Date.now();
      }
      if (this.onMessage) {
        this.onMessage(message);
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
    // processIncomingCall: (peerId: string) => Promise<void> = (peerId: string) => {
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

    closeConnection() {
      if (this.isConnected()) this.dataChannel.close()
    }
  }

}
