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

  export const enum Protocol {
    U2U = "U2U",
    signaling = "signaling",
    noname = ""
  }

  /**
   * Protocol handles the set of messages to provide some high level network functionality.
   * Typically, message processing consists of changing the state and/or sending response messages.
   * Protocol class is stateless, the state is stored mainly in the connector.
   */
  export class BaseProtocol {

    connector: P2PConnector

    get name(): p2p.Protocol {
      return Protocol.noname
    }

    handle(messageType: string, roomName: string, msg) {
      let f = this.handlers[messageType]
      if (f) return f(roomName, msg)
      throw new Error(`Handler for message type "${messageType}" in protocol "${this.name}" is not found`)
    }

    readonly baseHandlers = {

      PONG: (roomName: string, msg) => {
        //maybe todo
      },

      ERROR: (msg) => {
        this.connector.signalingError(msg.reason)
      }

    }

    handlers = this.baseHandlers

  }

}
