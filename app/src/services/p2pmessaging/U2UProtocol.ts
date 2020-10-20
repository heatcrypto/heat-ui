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

  export class U2UProtocol extends BaseProtocol {

    get name(): p2p.ProtocolName {
      return "U2U"
    }

    callForNewContact(recipient: string, caller: string, room: Room) {
      this.connector.sendWebsocketMessage(this.name, [{type: "CALL", toPeerId: recipient, caller: caller, room: room.name}]);
    }

    readonly handlers = Object.assign(this.baseHandlers, {

      chat: (roomName: string, msg) => {
        let room: Room = this.connector.rooms.get(roomName) || this.connector.messenger.getOneToOneRoom(msg.fromPeer || msg.sender, true)
        if (room) {
          let payload = JSON.parse(msg.payload)
          let chatMessage: U2UMessage = JSON.parse(this.connector.decrypt(payload, msg.sender));
          chatMessage.transport = "server";
          this.connector.processRoomMessage(chatMessage, room, msg.sender);
          //response to server that message is delivered by the client app
          this.connector.sendWebsocketMessage("U2U", [{
            id: utils.uuidv4(),
            type: "STATUS",
            sender: this.connector.identity,
            recipient: msg.sender,
            payload: JSON.stringify({msgId: chatMessage.id, stage: 1})  // stage 1 mean delivered
          }])
        } else {
          throw new Error(`Cannot get 'chat room' for message sender ${msg.fromPeer}`)
        }
      },

      STATUS: (roomName: string, msg) => {
        let payload = JSON.parse(msg.payload)
        console.log(payload)
        //todo mark message payload.msgId as delivered
        //message status, sender is the server {"type": "STATUS", "msgId": "X032T-U34Y", "stage": 3, "remark": "limit max messages per account reached"}
        //stages: 1 - delivered, 2 - read, 3 - rejected by server
        let room: Room = this.connector.rooms.get(roomName) || this.connector.messenger.getOneToOneRoom(msg.sender || msg.fromPeer, true)
        if (room) {
          room.getMessageHistory().putExtraInfo(payload.msgId, {status: {stage: msg.stage, remark: msg.remark}})
        }
      }

    })

  }

}
