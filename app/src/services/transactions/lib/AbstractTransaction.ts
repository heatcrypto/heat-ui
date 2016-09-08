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
abstract class AbstractTransaction {

  constructor(public requestType: string, public engine: EngineService) {}

  abstract verify(transaction: any, bytes: IByteArrayWithPosition, data?: any): boolean;

  /**
   * Verify and sign transaction bytes as returned from API createTransaction.
   *
   * @param transactionBytes String unsigned bytes as HEX string
   * @param signature
   * @param data Object user provided data, this was send to createTransaction
   *
   * @returns string or undefined in case of error
   */
  verifyAndSignTransactionBytes(transactionBytes: string, signature, data: any): string {
    var transaction: any = {};
    var byteArray = converters.hexStringToByteArray(transactionBytes);
    transaction.type = byteArray[0];

    transaction.version = (byteArray[1] & 0xF0) >> 4;
    transaction.subtype = byteArray[1] & 0x0F;

    transaction.timestamp = String(converters.byteArrayToSignedInt32(byteArray, 2));
    transaction.deadline = String(converters.byteArrayToSignedShort(byteArray, 6));
    if (this.engine.type == EngineType.FIMK) {
      transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 8));
      transaction.publicKey = converters.byteArrayToHexString(byteArray.slice(16, 48));
    }
    else if (this.engine.type == EngineType.NXT) {
      transaction.publicKey = converters.byteArrayToHexString(byteArray.slice(8, 40));
      transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 40));
    }
    else if (this.engine.type == EngineType.HEAT) {
      transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 8));
      transaction.publicKey = converters.byteArrayToHexString(byteArray.slice(16, 48));
    }
    else {
      throw new Error('Unsupported engine type');
    }

    transaction.amountNQT = String(converters.byteArrayToBigInteger(byteArray, 48));
    transaction.feeNQT = String(converters.byteArrayToBigInteger(byteArray, 56));

    var refHash = byteArray.slice(64, 96);
    transaction.referencedTransactionFullHash = converters.byteArrayToHexString(refHash);
    if (transaction.referencedTransactionFullHash == "0000000000000000000000000000000000000000000000000000000000000000") {
      transaction.referencedTransactionFullHash = "";
    }
    //transaction.referencedTransactionId = converters.byteArrayToBigInteger([refHash[7], refHash[6], refHash[5], refHash[4], refHash[3], refHash[2], refHash[1], refHash[0]], 0);

    transaction.flags = 0;
    if (transaction.version > 0) {
      transaction.flags = converters.byteArrayToSignedInt32(byteArray, 160);
      transaction.ecBlockHeight = String(converters.byteArrayToSignedInt32(byteArray, 164));
      transaction.ecBlockId = String(converters.byteArrayToBigInteger(byteArray, 168));
    }
    if (!("amountNQT" in data)) {
      data.amountNQT = "0";
    }
    if (!("recipient" in data)) {
      if (this.engine.type == EngineType.FIMK) {
        data.recipient = "1739068987193023818";
        data.recipientRS = "FIM-MRCC-2YLS-8M54-3CMAJ";
      }
      else if (this.engine.type == EngineType.NXT) {
        data.recipient = "1739068987193023818";
        data.recipientRS = "NXT-MRCC-2YLS-8M54-3CMAJ";
      }
      else if (this.engine.type == EngineType.HEAT) {
        data.recipient = "1739068987193023818";
        data.recipientRS = "HEAT-MRCC-2YLS-8M54-3CMAJ";
      }
      else {
        throw new Error('Unsupported engine type');
      }
    }
    if (transaction.publicKey != data.publicKey) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.publicKey != data.publicKey', transaction, data);
      return;
    }
    if (transaction.deadline !== data.deadline) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.deadline !== data.deadline', transaction, data);
      return;
    }
    if (transaction.recipient !== data.recipient) {
      if (data.recipient == "1739068987193023818") {
        //ok
      } else {
        console.log('verifyAndSignTransactionBytes.failed | transaction.recipient !== data.recipient', transaction, data);
        return;
      }
    }
    if (transaction.amountNQT !== data.amountNQT || transaction.feeNQT !== data.feeNQT) {
      console.log('verifyAndSignTransactionBytes.failed | transaction.amountNQT !== data.amountNQT || transaction.feeNQT !== data.feeNQT', transaction, data);
      return;
    }
    if ("referencedTransactionFullHash" in data) {
      if (transaction.referencedTransactionFullHash !== data.referencedTransactionFullHash) {
        console.log('verifyAndSignTransactionBytes.failed | transaction.referencedTransactionFullHash !== data.referencedTransactionFullHash', transaction, data);
        return;
      }
    }
    else if (transaction.referencedTransactionFullHash !== "") {
      console.log('verifyAndSignTransactionBytes.failed | transaction.referencedTransactionFullHash !== ""', transaction, data);
      return;
    }

    var pos: number;
    if (transaction.version > 0) {
      if (this.requestType == "sendMoney" || this.requestType == "sendMessage") { // has empty attachment, so no attachmentVersion byte...
        pos = 176;
      }
      else {
        pos = 177;
      }
    }
    else {
      pos = 160;
    }

    var bytes: IByteArrayWithPosition = {
      byteArray: byteArray,
      pos: pos
    };
    if (!this.verify(transaction, bytes, data)) {
      return;
    }
    pos = bytes.pos;

    var position = 1;
    // non-encrypted message
    if ((transaction.flags & position) != 0 || (this.requestType == "sendMessage" && data.message)) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var messageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageIsText = messageLength < 0; // ugly hack??
      if (messageLength < 0) {
        messageLength &= 2147483647;
      }
      pos += 4;
      if (transaction.messageIsText) {
        transaction.message = converters.byteArrayToString(byteArray, pos, messageLength);
      }
      else {
        var slice = byteArray.slice(pos, pos + messageLength);
        transaction.message = converters.byteArrayToHexString(slice);
      }
      pos += messageLength;
      var messageIsText = (transaction.messageIsText ? "true" : "false");
      if (messageIsText != data.messageIsText) {
        return;
      }
      if (transaction.message !== data.message) {
        return;
      }
    }
    else if (data.message) {
      return;
    }
    position <<= 1;
    //encrypted note
    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var encryptedMessageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageToEncryptIsText = encryptedMessageLength < 0;
      if (encryptedMessageLength < 0) {
        encryptedMessageLength &= 2147483647; // http://en.wikipedia.org/wiki/2147483647
      }
      pos += 4;
      transaction.encryptedMessageData = converters.byteArrayToHexString(byteArray.slice(pos, pos + encryptedMessageLength));
      pos += encryptedMessageLength;
      transaction.encryptedMessageNonce = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      pos += 32;
      var messageToEncryptIsText = (transaction.messageToEncryptIsText ? "true" : "false");
      if (messageToEncryptIsText != data.messageToEncryptIsText) {
        return;
      }
      if (transaction.encryptedMessageData !== data.encryptedMessageData || transaction.encryptedMessageNonce !== data.encryptedMessageNonce) {
        return;
      }
    }
    else if (data.encryptedMessageData) {
      return;
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var recipientPublicKey = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      if (recipientPublicKey != data.recipientPublicKey) {
        return;
      }
      pos += 32;
    }
    else if (data.recipientPublicKey) {
      return;
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      var attachmentVersion = byteArray[pos];
      pos++;
      var encryptedToSelfMessageLength = converters.byteArrayToSignedInt32(byteArray, pos);
      transaction.messageToEncryptToSelfIsText = encryptedToSelfMessageLength < 0;
      if (encryptedToSelfMessageLength < 0) {
        encryptedToSelfMessageLength &= 2147483647;
      }
      pos += 4;
      transaction.encryptToSelfMessageData = converters.byteArrayToHexString(byteArray.slice(pos, pos + encryptedToSelfMessageLength));
      pos += encryptedToSelfMessageLength;
      transaction.encryptToSelfMessageNonce = converters.byteArrayToHexString(byteArray.slice(pos, pos + 32));
      pos += 32;
      var messageToEncryptToSelfIsText = (transaction.messageToEncryptToSelfIsText ? "true" : "false");
      if (messageToEncryptToSelfIsText != data.messageToEncryptToSelfIsText) {
        return;
      }
      if (transaction.encryptToSelfMessageData !== data.encryptToSelfMessageData ||
        transaction.encryptToSelfMessageNonce !== data.encryptToSelfMessageNonce) {
        return;
      }
    }
    else if (data.encryptToSelfMessageData) {
      return;
    }
    return transactionBytes.substr(0, 192) + signature + transactionBytes.substr(320);
  }
}