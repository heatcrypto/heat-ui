/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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
declare var curve25519: any;
declare var curve25519_: any;
declare var SHA256_init: any;
declare var SHA256_write: any;
declare var SHA256_finalize: any;
declare var pako: any;
declare var CryptoJS: any;
module heat.crypto {

  var _hash = {
    init: SHA256_init,
    update: SHA256_write,
    getBytes: SHA256_finalize
  };

  function simpleHash(message) {
    _hash.init();
    _hash.update(message);
    return _hash.getBytes();
  }

  /**
   * @param curve ShortArray
   * @returns ShortArray
   */
  function curve25519_clamp(curve) {
    curve[0] &= 0xFFF8;
    curve[15] &= 0x7FFF;
    curve[15] |= 0x4000;
    return curve;
  }

  /**
   * Calculates a SHA256 hash from a string.
   *
   * @param inputString String (regular UTF-8 string)
   * @returns Hash as HEX String
   */
  export function calculateStringHash(inputString: string) {
    var hexString = converters.stringToHexString(inputString);
    var bytes = converters.hexStringToByteArray(hexString);
    var hashBytes = simpleHash(bytes);
    return converters.byteArrayToHexString(hashBytes);
  }

  /**
   * @param byteArray ByteArray
   * @param startIndex Int
   * @returns BigInteger
   */
  function byteArrayToBigInteger(byteArray, startIndex?: number) {
    var value = new BigInteger("0", 10);
    var temp1, temp2;
    for (var i = byteArray.length - 1; i >= 0; i--) {
      temp1 = value.multiply(new BigInteger("256", 10));
      temp2 = temp1.add(new BigInteger(byteArray[i].toString(10), 10));
      value = temp2;
    }
    return value;
  }

  /**
   * @param unsignedTransaction hex-string
   * @param signature hex-string
   * @returns hex-string
   */
  export function calculateFullHash(unsignedTransaction: string, signature: string): string {
    var unsignedTransactionBytes = converters.hexStringToByteArray(unsignedTransaction);
    var signatureBytes = converters.hexStringToByteArray(signature);
    var signatureHash = simpleHash(signatureBytes);

    _hash.init();
    _hash.update(unsignedTransactionBytes);
    _hash.update(signatureHash);
    var fullHash = _hash.getBytes();

    return converters.byteArrayToHexString(fullHash);
  }

  /**
   * @param fullHashHex hex-string
   * @returns string
   */
  export function calculateTransactionId(fullHashHex:string):string {
    var slice         = (converters.hexStringToByteArray(fullHashHex)).slice(0, 8);
    var transactionId = byteArrayToBigInteger(slice).toString();
    return transactionId;
  }

  /**
   * Turns a secretphrase into a public key
   * @param secretPhrase String
   * @returns HEX string
   */
  export function secretPhraseToPublicKey(secretPhrase: string): string {
    var secretHex = converters.stringToHexString(secretPhrase);
    var secretPhraseBytes = converters.hexStringToByteArray(secretHex);
    var digest = simpleHash(secretPhraseBytes);
    return converters.byteArrayToHexString(curve25519.keygen(digest).p);
  }

  /**
   * ..
   * @param secretPhrase Ascii String
   * @returns hex-string
   */
  export function getPrivateKey(secretPhrase: string) {
    SHA256_init();
    SHA256_write(converters.stringToByteArray(secretPhrase));
    return converters.shortArrayToHexString(curve25519_clamp(converters.byteArrayToShortArray(SHA256_finalize())));
  }

  /**
   * @param secretPhrase Ascii String
   * @returns String
   */
  export function getAccountId(secretPhrase: string) {
    var publicKey = this.secretPhraseToPublicKey(secretPhrase);
    return this.getAccountIdFromPublicKey(publicKey);
  }

  /**
   * @param secretPhrase Hex String
   * @returns String
   */
  export function getAccountIdFromPublicKey(publicKey: string) {
    _hash.init();
    _hash.update(converters.hexStringToByteArray(publicKey));

    var account   = _hash.getBytes();
    var slice     = (converters.hexStringToByteArray(converters.byteArrayToHexString(account))).slice(0, 8);
    return byteArrayToBigInteger(slice).toString();
  }


  /**
   * TODO pass secretphrase as string instead of HEX string, convert to
   * hex string ourselves.
   *
   * @param message HEX String
   * @param secretPhrase Hex String
   * @returns Hex String
   */
  export function signBytes(message: string, secretPhrase: string) {
    var messageBytes      = converters.hexStringToByteArray(message);
    var secretPhraseBytes = converters.hexStringToByteArray(secretPhrase);

    var digest = simpleHash(secretPhraseBytes);
    var s = curve25519.keygen(digest).s;
    var m = simpleHash(messageBytes);

    _hash.init();
    _hash.update(m);
    _hash.update(s);
    var x = _hash.getBytes();

    var y = curve25519.keygen(x).p;

    _hash.init();
    _hash.update(m);
    _hash.update(y);
    var h = _hash.getBytes();

    var v = curve25519.sign(h, x, s);

    return converters.byteArrayToHexString(v.concat(h));
  }

  /**
   * ...
   * @param signature     Hex String
   * @param message       Hex String
   * @param publicKey     Hex String
   * @returns Boolean
   */
  export function verifyBytes(signature: string, message: string, publicKey: string): boolean {
    var signatureBytes  = converters.hexStringToByteArray(signature);
    var messageBytes    = converters.hexStringToByteArray(message);
    var publicKeyBytes  = converters.hexStringToByteArray(publicKey);
    var v = signatureBytes.slice(0, 32);
    var h = signatureBytes.slice(32);
    var y = curve25519.verify(v, h, publicKeyBytes);

    var m = simpleHash(messageBytes);

    _hash.init();
    _hash.update(m);
    _hash.update(y);
    var h2 = _hash.getBytes();

    return areByteArraysEqual(h, h2);
  }

  function areByteArraysEqual(bytes1: Array<number>, bytes2: Array<number>): boolean {
    if (bytes1.length !== bytes2.length) {
      return false;
    }
    for (var i = 0; i < bytes1.length; ++i) {
      if (bytes1[i] !== bytes2[i])
        return false;
    }
    return true;
  }

  export interface IEncryptOptions {

    /* Recipient account id */
    account?: string;

    /* Recipient public key */
    publicKey?:  Array<number>;

    /* Private key to decrypt messages to self */
    privateKey?: Array<number>;

    /* Shared key to encrypt messages to other account */
    sharedKey?: Array<number>;

    /* Uint8Array */
    nonce?: any;
  }

  /**
   * @param message String
   * @param options Object {
   *    account: String,    // recipient account id
   *    publicKey: String,  // recipient public key
   * }
   * @param secretPhrase String
   * @returns { message: String, nonce: String }
   */
  export function encryptNote(message: string, options: IEncryptOptions, secretPhrase: string, uncompressed?: boolean) {
    if (!options.sharedKey) {
      if (!options.privateKey) {
        options.privateKey = converters.hexStringToByteArray(this.getPrivateKey(secretPhrase));
      }
      if (!options.publicKey) {
        throw new Error('Missing publicKey argument');
      }
    }
    var encrypted = encryptData(converters.stringToByteArray(message), options, uncompressed);
    return {
      "message": converters.byteArrayToHexString(encrypted.data),
      "nonce": converters.byteArrayToHexString(encrypted.nonce)
    };
  }

  /**
   * @param message Byte Array
   * @param options Object {
   *    account: String,    // recipient account id
   *    publicKey: String,  // recipient public key
   * }
   * @param secretPhrase String
   * @returns { message: String, nonce: String }
   */
  export function encryptBinaryNote(message: Array<number>, options: IEncryptOptions, secretPhrase: string, uncompressed?: boolean) {
    if (!options.sharedKey) {
      if (!options.privateKey) {
        options.privateKey = converters.hexStringToByteArray(this.getPrivateKey(secretPhrase));
      }
      if (!options.publicKey) {
        throw new Error('Missing publicKey argument');
      }
    }
    var encrypted = encryptData(message, options, uncompressed);
    return {
      "message": converters.byteArrayToHexString(encrypted.data),
      "nonce": converters.byteArrayToHexString(encrypted.nonce)
    };
  }

  /**
   * @param key1 ByteArray
   * @param key2 ByteArray
   * @returns ByteArray
   */
  function getSharedKey(key1, key2) {
    return converters.shortArrayToByteArray(
              curve25519_(converters.byteArrayToShortArray(key1),
                          converters.byteArrayToShortArray(key2), null));
  }

  function encryptData(plaintext: Array<number>, options: IEncryptOptions, uncompressed?: boolean) {
    var crypto: any = window.crypto || window['msCrypto'];
    if (!crypto) {
      throw new Error("Browser not supported");
    }

    if (!options.sharedKey) {
      options.sharedKey = getSharedKey(options.privateKey, options.publicKey);
    }

    options.nonce = new Uint8Array(32);
    crypto.getRandomValues(options.nonce);

    var compressedPlaintext = uncompressed ? new Uint8Array(plaintext) : pako.gzip(new Uint8Array(plaintext));
    var data = aesEncrypt(compressedPlaintext, options);
    return {
      "nonce": options.nonce,
      "data": data
    };
  }

  function aesEncrypt(plaintext: Array<number>, options: IEncryptOptions) {
    var crypto: any = window.crypto || window['msCrypto'];
    var text = converters.byteArrayToWordArray(plaintext);
    var sharedKey = options.sharedKey ? options.sharedKey.slice(0) :
                                        getSharedKey(options.privateKey, options.publicKey);

    for (var i = 0; i < 32; i++) {
      sharedKey[i] ^= options.nonce[i];
    }

    var tmp: any = new Uint8Array(16);
    crypto.getRandomValues(tmp);

    var key = CryptoJS.SHA256(converters.byteArrayToWordArray(sharedKey));
    var iv = converters.byteArrayToWordArray(tmp);
    var encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv
    });

    var ivOut = converters.wordArrayToByteArray(encrypted.iv);
    var ciphertextOut = converters.wordArrayToByteArray(encrypted.ciphertext);
    return ivOut.concat(ciphertextOut);
  }

  interface IEncryptedMessage {
    isText: boolean;
    data: string;
    nonce: string;
  }

  export function encryptMessage(message: string, publicKey: string, secretPhrase: string, uncompressed?: boolean): IEncryptedMessage {
    var options: crypto.IEncryptOptions = {
      "account": crypto.getAccountIdFromPublicKey(publicKey),
      "publicKey": converters.hexStringToByteArray(publicKey)
    };
    var encrypted = heat.crypto.encryptNote(message, options, secretPhrase, uncompressed);
    return {
      isText: true,
      data: encrypted.message,
      nonce: encrypted.nonce
    };
  }

  export function decryptMessage(data: string, nonce: string, publicKey: string, secretPhrase: string, uncompressed?: boolean): string {
    var privateKey = converters.hexStringToByteArray(this.getPrivateKey(secretPhrase));
    var publicKeyBytes = converters.hexStringToByteArray(publicKey);
    var sharedKey = getSharedKey(privateKey, publicKeyBytes);
    var dataBytes = converters.hexStringToByteArray(data);
    var nonceBytes = converters.hexStringToByteArray(nonce);
    try {
      return decryptData(dataBytes, {
        privateKey: privateKey,
        publicKey:  publicKeyBytes,
        nonce:      nonceBytes,
        sharedKey:  sharedKey
      }, uncompressed);
    } catch (e) {
      if (e instanceof RangeError || e == 'incorrect header check') {
        console.error('Managed Exception: ' + e);

        return decryptData(dataBytes, {
          privateKey: privateKey,
          publicKey:  publicKeyBytes,
          nonce:      nonceBytes,
          sharedKey:  sharedKey
        }, !uncompressed);
      }
      throw e;
    }
  }

  function decryptData(data, options, uncompressed?: boolean) {
    var compressedPlaintext = aesDecrypt(data, options);
    var binData = new Uint8Array(compressedPlaintext);
    var data = uncompressed ? binData : pako.inflate(binData);
    return converters.byteArrayToString(data);
  }

  function aesDecrypt(ivCiphertext, options) {
    if (ivCiphertext.length < 16 || ivCiphertext.length % 16 != 0) {
      throw { name: "invalid ciphertext" };
    }

    var iv = converters.byteArrayToWordArray(ivCiphertext.slice(0, 16));
    var ciphertext = converters.byteArrayToWordArray(ivCiphertext.slice(16));
    var sharedKey = options.sharedKey.slice(0); //clone
    for (var i = 0; i < 32; i++) {
      sharedKey[i] ^= options.nonce[i];
    }

    var key = CryptoJS.SHA256(converters.byteArrayToWordArray(sharedKey));
    var encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext,
      iv: iv,
      key: key
    });
    var decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      iv: iv
    });
    var plaintext = converters.wordArrayToByteArray(decrypted);
    return plaintext;
  }

  export class PassphraseEncryptedMessage {
    ciphertext: string;
    salt: string;
    iv: string;
    HMAC: string;

    constructor(ciphertext: string, salt: string, iv: string, HMAC: string) {
      this.ciphertext = ciphertext;
      this.salt = salt;
      this.iv = iv;
      this.HMAC = HMAC;
    }

    static decode(encoded: string): PassphraseEncryptedMessage {
      var json = JSON.parse(encoded);
      return new PassphraseEncryptedMessage(json[0],json[1],json[2],json[3]);
    }

    encode(): string {
      return JSON.stringify([
        this.ciphertext,
        this.salt,
        this.iv,
        this.HMAC
      ]);
    }
  }

  export function passphraseEncrypt(message: string, passphrase: string): PassphraseEncryptedMessage {
    var salt = CryptoJS.lib.WordArray.random(256/8);
    var key = CryptoJS.PBKDF2(passphrase, salt, { iterations: 10, hasher:CryptoJS.algo.SHA256});
    var iv = CryptoJS.lib.WordArray.random(128 / 8);

    var encrypted = CryptoJS.AES.encrypt(message, key, { iv: iv });

    var ciphertext = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
    var salt_str = CryptoJS.enc.Hex.stringify(salt);
    var iv_str = CryptoJS.enc.Hex.stringify(iv);

    var key_str = CryptoJS.enc.Hex.stringify(key);
    var HMAC = CryptoJS.HmacSHA256(ciphertext + iv_str, key_str);
    var HMAC_str = CryptoJS.enc.Hex.stringify(HMAC);

    return new PassphraseEncryptedMessage(ciphertext, salt_str, iv_str, HMAC_str);
  }

  export function passphraseDecrypt(cp: PassphraseEncryptedMessage, passphrase: string): string {
    var iv = CryptoJS.enc.Hex.parse(cp.iv);
    var salt = CryptoJS.enc.Hex.parse(cp.salt);
    var key = CryptoJS.PBKDF2(passphrase, salt, { iterations: 10, hasher:CryptoJS.algo.SHA256});
    var ciphertext = CryptoJS.enc.Base64.parse(cp.ciphertext);
    var key_str = CryptoJS.enc.Hex.stringify(key);
    var HMAC = CryptoJS.HmacSHA256(cp.ciphertext + cp.iv, key_str);
    var HMAC_str = CryptoJS.enc.Hex.stringify(HMAC);

    // compare HMACs
    if (HMAC_str != cp.HMAC) {
        return null;
    }
    var _cp = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext
    });

    var decrypted = CryptoJS.AES.decrypt(_cp,key,{iv: iv});
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}