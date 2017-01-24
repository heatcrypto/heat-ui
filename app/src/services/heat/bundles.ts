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

interface IHeatBundleKeyStore {
  name: string;
  value: string;
}

interface IHeatBundleAssetProperties {
  asset: string;
  protocol: number;
  value: string;
}

module heat.bundle {
  var MAGIC = 2147483647;
  var KEY_STORE_SEED = MAGIC - 1;
  var ASSET_PROPERTIES_SEED = MAGIC - 2;

  /* Creates a keystore bundle */
  export function createKeyStore(bundle: IHeatBundleKeyStore): string {
    var buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
    buffer.writeInt32(KEY_STORE_SEED);
    var nameBytes = converters.stringToByteArray(bundle.name);
    buffer.writeShort(nameBytes.length);
    nameBytes.forEach((b)=> { buffer.writeByte(b) });

    var valueBytes = converters.stringToByteArray(bundle.value);
    valueBytes.forEach((b)=> { buffer.writeByte(b) });

    buffer.flip();
    return buffer.toHex();
  }

  /* Creates an asset properties bundle */
  export function createAssetProperties(bundle: IHeatBundleAssetProperties): string {
    var buffer = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
    buffer.writeInt32(ASSET_PROPERTIES_SEED);
    buffer.writeInt64(Long.fromString(bundle.asset, true));
    buffer.writeInt32(bundle.protocol);

    var valueBytes = converters.stringToByteArray(bundle.value);
    buffer.writeShort(valueBytes.length);
    valueBytes.forEach((b)=> { buffer.writeByte(b) });

    buffer.flip();
    return buffer.toHex();
  }
}