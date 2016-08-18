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
class ReplicatorBundle extends ReplicatorAPI {

  private static MARKER: number = 2011120615;
  private static VERSION: number = 1;
  private list : Array<ReplicatorMessage> = [];
  private cachedHex: string;

  constructor(public encrypt: boolean) {
    super();
  }

  /* @Override */
  add(message: ReplicatorMessage): ReplicatorBundle {
    this.list.push(message);
    return this;
  }

  toHex(): string {
    if (!angular.isDefined(this.cachedHex)) {
      var buffers: Array<ByteBuffer> = this.list.map((message: ReplicatorMessage) => message.create());
      var buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
      buffer.writeInt32(ReplicatorBundle.MARKER)
      buffer.writeByte(ReplicatorBundle.VERSION);
      buffers.forEach((b: ByteBuffer) => { buffer.append(b) });
      buffer.flip();

      if (buffer.limit > 1000) {
        throw new Error("Contents are too big");
      }
      console.log("Byte count=" + buffer.limit);
      this.cachedHex = buffer.toHex();
    }
    return this.cachedHex;
  }

  toBytes(): Array<number> {
    return converters.hexStringToByteArray(this.toHex());
  }

  isEmpty() {
    return this.list.length == 0;
  }
}