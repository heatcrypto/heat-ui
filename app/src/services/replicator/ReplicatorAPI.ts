/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
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
abstract class ReplicatorAPI {

  private SET_FLAG = 1;
  private RESET_FLAG = 2;
  private MESSAGE_REPLY_TO = 3;

  private address: AddressService = <AddressService> heat.$inject.get('address');

  abstract add(message: ReplicatorMessage);

  private create(type: number, encode: (buffer: ByteBuffer) => void): ReplicatorMessage {
    return this.add(new ReplicatorMessage(type, encode));
  }

  public messageReplyTo(messageId: string) {
    return this.create(this.MESSAGE_REPLY_TO, (buffer: ByteBuffer) => {
      buffer.writeInt64(Long.fromString(messageId, true));
    });
  }

  /* Sets either recipientStatus or senderStatus of the message identified by
     messageId. To use the messageId for the transaction that this bundle is
     attached to pass '0' as messageId */
  public setFlag(flag: number, messageId: string) {
    return this.create(this.SET_FLAG, (buffer: ByteBuffer) => {
      buffer.writeInt32(flag);
      buffer.writeInt64(Long.fromString(messageId, true));
    });
  }

  /* Resets either recipientStatus or senderStatus of the message identified by
     messageId. To use the messageId for the transaction that this bundle is
     attached to pass '0' as messageId */
  public resetFlag(flag: number, messageId: string) {
    return this.create(this.RESET_FLAG, (buffer: ByteBuffer) => {
      buffer.writeInt32(flag);
      buffer.writeInt64(Long.fromString(messageId, true));
    });
  }
}