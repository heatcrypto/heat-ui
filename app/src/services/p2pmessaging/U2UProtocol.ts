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

  export interface MessageExtraInfo {
    status: {
      stage: number, // 1 - delivered, 2 - read, 3 - rejected by server
      remark?: string
    }
  }

  export class U2UProtocol extends BaseProtocol {

    get name(): p2p.Protocol {
      return Protocol.U2U
    }

    requestNewContact(recipient: string, caller: string, room: Room, text: string) {
      //this.connector.sendWebsocketMessage(this.name, [{type: "newContact", recipient: recipient, sender: caller, room: room.name}])
      let m = new U2UMessage("chat", Date.now(), text)
      let encrypted = this.connector.encrypt(JSON.stringify(m), recipient)
      let sendingData = {
          id: m.id,
          type: m.type,
          room: room.name,
          sender: caller,
          recipient: recipient,
          payload: JSON.stringify(encrypted)
        }
      this.connector.sendWebsocketMessage(this.name, [sendingData])
    }

    /**
     * Request the file saved on the server for this recipient
     */
    requestFile(fileMessageId: string, fileSender: string) {
      let sendingData = {
        id: utils.uuidv4(),
        type: "DOWNLOADFILE",
        sender: this.connector.identity,
        fileMessageId: fileMessageId,
        fileSender: fileSender
      }
      return this.connector.sendWebsocketMessage(this.name, [sendingData])
    }

    private commonMessageHandler = (roomName: string, msg) => {
      let room: Room = this.connector.rooms.get(roomName) || this.connector.messenger.getOneToOneRoom(msg.fromPeer || msg.sender, true)
      if (room) {
        let payload = JSON.parse(msg.payload)
        let chatMessage: U2UMessage = JSON.parse(this.connector.decrypt(payload, msg.sender));
        chatMessage.transport = "server";

        this.connector.processRoomMessage(chatMessage, room, msg.sender);

        //response to server that message is delivered by the client app
        this.connector.sendWebsocketMessage(Protocol.U2U, [{
          id: utils.uuidv4(),
          type: "STATUS",
          sender: this.connector.identity,
          recipient: msg.sender,
          payload: JSON.stringify({msgId: chatMessage.id, stage: 1})  // stage 1 mean delivered
        }])
      } else {
        throw new Error(`Cannot get 'chat room' for message sender ${msg.fromPeer}`)
      }
    }

    // set of functions to process the incoming messages
    readonly handlers = Object.assign(this.baseHandlers, {

      chat: this.commonMessageHandler,

      file: this.commonMessageHandler,

      newContact: (roomName: string, msg) => {
        console.log(msg)
      },

      STATUS: (roomName: string, msg) => {
        let payload = JSON.parse(msg.payload)
        console.log(payload)
        //todo mark message payload.msgId as delivered
        //message status, sender is the server {"type": "STATUS", "msgId": "X032T-U34Y", "stage": 3, "remark": "limit max messages per account reached"}
        //stages: 1 - delivered, 2 - read, 3 - rejected by server
        let room: Room = this.connector.rooms.get(roomName) || this.connector.messenger.getOneToOneRoom(msg.sender || msg.fromPeer, true)
        if (room) {
          room.getMessageHistory().putExtraInfo(payload.msgId, {status: {stage: payload.stage, remark: payload.remark}})
        }
      },

      TRANSFERFILE: (roomName: string, msg) => {
        let payload = JSON.parse(msg.payload)
        let fileAsString = this.connector.decrypt(payload, msg.fileSender)
        let fileContent = converters.stringToArrayBuffer(fileAsString)
        this.connector.messenger.onFile(fileContent)
      },

      ERROR: (roomName: string, msg) => {
        let errorText = msg
          ? `Server error response. ${roomName ? "Room " + roomName : ""} ${msg.reason}`
          : "error"
        this.connector.processError(errorText, Protocol.U2U)
      }

    })

  }

}
