/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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
// declare var unescape: any;
// declare var escape: any;
declare var BigInteger: any;
module converters {

	var charToNibble = {};
	var nibbleToChar = [];
	var i;
	for (i = 0; i <= 9; ++i) {
		var character = i.toString();
		charToNibble[character] = i;
		nibbleToChar.push(character);
	}

	for (i = 10; i <= 15; ++i) {
		var lowerChar = String.fromCharCode('a'.charCodeAt(0) + i - 10);
		var upperChar = String.fromCharCode('A'.charCodeAt(0) + i - 10);

		charToNibble[lowerChar] = i;
		charToNibble[upperChar] = i;
		nibbleToChar.push(lowerChar);
	}

  export function byteArrayToHexString(bytes: Array<number>):string {
    var str = '';
    for (var i = 0; i < bytes.length; ++i) {
      if (bytes[i] < 0) {
        bytes[i] += 256;
      }
      str += nibbleToChar[bytes[i] >> 4] + nibbleToChar[bytes[i] & 0x0F];
    }
    return str;
  }

  export function stringToByteArray(stringValue: string): Array<number> {
    // @ts-ignore
    var str = unescape(encodeURIComponent(stringValue)); //temporary
    var bytes = new Array(str.length);
    for (var i = 0; i < str.length; ++i) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  }

  export function hexStringToByteArray(str: string): Array<number> {
    var bytes = [];
    var i = 0;
    if (0 !== str.length % 2) {
      bytes.push(charToNibble[str.charAt(0)]);
      ++i;
    }
    for (; i < str.length - 1; i += 2) {
      bytes.push((charToNibble[str.charAt(i)] << 4) + charToNibble[str.charAt(i + 1)]);
    }
    return bytes;
  }

  export function stringToHexString(str: string): string {
		return byteArrayToHexString(stringToByteArray(str));
	}

  export function hexStringToString(hex: string): string {
		return byteArrayToString(hexStringToByteArray(hex));
	}

  function checkBytesToIntInput(bytes: Array<number>, numBytes: number, opt_startIndex?:number): number {
    var startIndex = opt_startIndex || 0;
    if (startIndex < 0) {
      throw new Error('Start index should not be negative');
    }
    if (bytes.length < startIndex + numBytes) {
      throw new Error('Need at least ' + (numBytes) + ' bytes to convert to an integer');
    }
    return startIndex;
  }

  export function byteArrayToSignedShort(bytes: Array<number>, opt_startIndex?: number): any {
    var index = checkBytesToIntInput(bytes, 2, opt_startIndex);
    var value = bytes[index];
    value += bytes[index + 1] << 8;
    return value;
  }

  export function byteArrayToSignedInt32(bytes: Array<number>, opt_startIndex?: number) {
    var index = checkBytesToIntInput(bytes, 4, opt_startIndex);
    var value = bytes[index];
    value += bytes[index + 1] << 8;
    value += bytes[index + 2] << 16;
    value += bytes[index + 3] << 24;
    return value;
  }

	export function byteArrayToBigInteger(bytes: Array<number>, opt_startIndex?: number): jsbn.BigInteger {
    var index = checkBytesToIntInput(bytes, 8, opt_startIndex);
    var value = new BigInteger("0", 10);
    var temp1, temp2;
    for (var i = 7; i >= 0; i--) {
      temp1 = value.multiply(new BigInteger("256", 10));
      temp2 = temp1.add(new BigInteger(bytes[opt_startIndex + i].toString(10), 10));
      value = temp2;
    }
    return value;
  }

  interface IWordArray {
    sigBytes: number;
    words: Uint32Array
  }

	// create a wordArray that is Big-Endian
	export function byteArrayToWordArray(byteArray: Array<number>): IWordArray {
    var i = 0, offset = 0, word = 0, len = byteArray.length;
    var words = new Uint32Array(((len / 4) | 0) + (len % 4 == 0 ? 0 : 1));
    while (i < (len - (len % 4))) {
      words[offset++] = (byteArray[i++] << 24) | (byteArray[i++] << 16) | (byteArray[i++] << 8) | (byteArray[i++]);
    }
    if (len % 4 != 0) {
      word = byteArray[i++] << 24;
      if (len % 4 > 1) {
        word = word | byteArray[i++] << 16;
      }
      if (len % 4 > 2) {
        word = word | byteArray[i++] << 8;
      }
      words[offset] = word;
    }
    return { sigBytes: len, words: words };
  }

  // assumes wordArray is Big-Endian
	export function wordArrayToByteArray(wordArray: IWordArray): Array<number> {
    var len = wordArray.words.length;
    if (len == 0) {
      return new Array(0);
    }
    var byteArray = new Array(wordArray.sigBytes);
    var offset = 0, word, i;
    for (i = 0; i < len - 1; i++) {
      word = wordArray.words[i];
      byteArray[offset++] = word >> 24;
      byteArray[offset++] = (word >> 16) & 0xff;
      byteArray[offset++] = (word >> 8) & 0xff;
      byteArray[offset++] = word & 0xff;
    }
    word = wordArray.words[len - 1];
    byteArray[offset++] = word >> 24;
    if (wordArray.sigBytes % 4 == 0) {
      byteArray[offset++] = (word >> 16) & 0xff;
      byteArray[offset++] = (word >> 8) & 0xff;
      byteArray[offset++] = word & 0xff;
    }
    if (wordArray.sigBytes % 4 > 1) {
      byteArray[offset++] = (word >> 16) & 0xff;
    }
    if (wordArray.sigBytes % 4 > 2) {
      byteArray[offset++] = (word >> 8) & 0xff;
    }
    return byteArray;
  }

  // TODO @opt_startIndex and @length dont seem to be used, verify with rest of code and remove if unused
  export function byteArrayToString(bytes: Array<number>, opt_startIndex?: any, length?: any): string {
    if (length == 0) {
      return "";
    }
    if (opt_startIndex && length) {
      var index = checkBytesToIntInput(bytes, parseInt(length, 10), parseInt(opt_startIndex, 10));
      bytes = bytes.slice(opt_startIndex, opt_startIndex + length);
    }
    // @ts-ignore
    return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes)));
  }

  export function byteArrayToShortArray(byteArray: Array<number>): Array<number> {
    var shortArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var i;
    for (i = 0; i < 16; i++) {
      shortArray[i] = byteArray[i * 2] | byteArray[i * 2 + 1] << 8;
    }
    return shortArray;
  }

	export function shortArrayToByteArray(shortArray: Array<number>): Array<number> {
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var i;
    for (i = 0; i < 16; i++) {
      byteArray[2 * i] = shortArray[i] & 0xff;
      byteArray[2 * i + 1] = shortArray[i] >> 8;
    }
    return byteArray;
  }

	// export function shortArrayToHexString(ary:Array<number>):string {
  //   var res = "";
  //   for (var i = 0; i < ary.length; i++) {
  //     res += nibbleToChar[(ary[i] >> 4) & 0x0f] + nibbleToChar[ary[i] & 0x0f] + nibbleToChar[(ary[i] >> 12) & 0x0f] + nibbleToChar[(ary[i] >> 8) & 0x0f];
  //   }
  //   return res;
  // }

  // slightly optimized (without string concatenation - heat)
	export function shortArrayToHexString(ary:Array<number>):string {
    var res: Array<string> = [];
    for (var i = 0; i < ary.length; i++) {
      res.push(nibbleToChar[(ary[i] >> 4) & 0x0f],
               nibbleToChar[ary[i] & 0x0f],
               nibbleToChar[(ary[i] >> 12) & 0x0f],
               nibbleToChar[(ary[i] >> 8) & 0x0f]);
    }
    return res.join("");
  }

	export function int32ToBytes(x: number, opt_bigEndian: boolean) {
		return intToBytes_(x, 4, 4294967295, opt_bigEndian);
	}

  /**
   * Produces an array of the specified number of bytes to represent the integer
   * value. Default output encodes ints in little endian format. Handles signed
   * as well as unsigned integers. Due to limitations in JavaScript's number
   * format, x cannot be a true 64 bit integer (8 bytes).
   */
  function intToBytes_(x: number, numBytes: number, unsignedMax: number, opt_bigEndian: boolean): Array<number> {
    var signedMax = Math.floor(unsignedMax / 2);
    var negativeMax = (signedMax + 1) * -1;
    if (x != Math.floor(x) || x < negativeMax || x > unsignedMax) {
      throw new Error(x + ' is not a ' + (numBytes * 8) + ' bit integer');
    }
    var bytes = [];
    var current;
    // Number type 0 is in the positive int range, 1 is larger than signed int,
    // and 2 is negative int.
    var numberType = x >= 0 && x <= signedMax ? 0 :
      x > signedMax && x <= unsignedMax ? 1 : 2;
    if (numberType == 2) {
      x = (x * -1) - 1;
    }
    for (var i = 0; i < numBytes; i++) {
      if (numberType == 2) {
        current = 255 - (x % 256);
      } else {
        current = x % 256;
      }

      if (opt_bigEndian) {
        bytes.unshift(current);
      } else {
        bytes.push(current);
      }

      if (numberType == 1) {
        x = Math.floor(x / 256);
      } else {
        x = x >> 8;
      }
    }
    return bytes;
  }
}
