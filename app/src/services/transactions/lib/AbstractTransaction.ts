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
class TransactionVerificationError {
  constructor(public name: string, public expected: any, public actual: any){}
}

class Appendix {
  protected version: number;
  constructor(bytes: IByteArrayWithPosition) {
    this.version = bytes.byteArray[bytes.pos];
    bytes.pos++;
  }
}
class AppendixMessage extends Appendix {
  public message: string;
  public isText: boolean;
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    var length = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    this.isText = length < 0;
    if (length < 0) {
      length &= 2147483647;
    }
    if (this.isText) {
      this.message = converters.byteArrayToString(bytes.byteArray, bytes.pos, length);
    }
    else {
      var slice = bytes.byteArray.slice(bytes.pos, bytes.pos + length);
      this.message = converters.byteArrayToHexString(slice);
    }
    bytes.pos += length;
  }
}
class AbstractEncryptedMessage extends Appendix {
  public encryptedMessageData: string;
  public encryptedMessageNonce: string;
  public isText: boolean;
  constructor(bytes: IByteArrayWithPosition,data: IHeatCreateTransactionInput) {
    super(bytes);
    var length = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    this.isText = length < 0;
    if (length < 0) {
      length &= 2147483647;
    }
    this.encryptedMessageData = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + length));
    bytes.pos += length;
    this.encryptedMessageNonce = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + 32));
    bytes.pos += 32;
  }
}
class AppendixEncryptedMessage extends AbstractEncryptedMessage {
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes, null);
  }
}
class AppendixPublicKeyAnnouncement extends Appendix {
  public publicKey: string;
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    this.publicKey = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + 32));
    bytes.pos += 32;
  }
}
class AppendixEncryptToSelfMessage extends AbstractEncryptedMessage {
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes, null);
  }
}
class AppendixPrivateNameAnnouncement extends Appendix {
  public privateNameAnnouncement: string; // unsignedLong
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    this.privateNameAnnouncement = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
  }
}
class AppendixPrivateNameAssignment extends Appendix {
  public privateNameAssignment: string;
  public signature: string;
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    this.privateNameAssignment = String(converters.byteArrayToBigInteger(bytes.byteArray, bytes.pos));
    bytes.pos += 8;
    this.signature = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + 64));
    bytes.pos += 64;
  }
}
class AppendixPublicNameAnnouncement extends Appendix {
  public publicNameAnnouncement: string;
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    var length = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    this.publicNameAnnouncement = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + length));
    bytes.pos += length;
  }
}
class AppendixPublicNameAssignment extends Appendix {
  public publicNameAssignment: string;
  public signature: string;
  constructor(bytes: IByteArrayWithPosition) {
    super(bytes);
    var length = converters.byteArrayToSignedInt32(bytes.byteArray, bytes.pos);
    bytes.pos += 4;
    this.publicNameAssignment = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + length));
    bytes.pos += length;
    this.signature = converters.byteArrayToHexString(bytes.byteArray.slice(bytes.pos, bytes.pos + 64));
    bytes.pos += 64;
  }
}

abstract class AbstractTransaction {

  abstract verify(transaction: any, bytes: IByteArrayWithPosition, data?: any): boolean;

  confirm(name: string, expected: any, actual: any) {
    if (expected != actual) {
      throw new TransactionVerificationError(name, expected, actual);
    }
  }

  /**
   * Verify and sign transaction bytes as returned from API createTransaction.
   *
   * @param transactionBytes String unsigned bytes as HEX string
   * @param signature
   * @param data Object user provided data, this was send to createTransaction
   *
   * @returns string or undefined in case of error
   */
  verifyAndSignTransactionBytes(transactionBytes: string, signature, data: IHeatCreateTransactionInput): string {
    var transaction: any = {};
    var byteArray = converters.hexStringToByteArray(transactionBytes);
    transaction.type = byteArray[0]; // 1
    transaction.version = (byteArray[1] & 0xF0) >> 4;
    transaction.subtype = byteArray[1] & 0x0F;  // 1
    transaction.timestamp = converters.byteArrayToSignedInt32(byteArray, 2); // 4

    transaction.deadline = converters.byteArrayToSignedShort(byteArray, 6); // 2
    this.confirm("deadline", data.deadline, transaction.deadline);

    transaction.senderPublicKey = converters.byteArrayToHexString(byteArray.slice(8, 40)); // 32
    this.confirm("senderPublicKey", data.publicKey, transaction.senderPublicKey);

    transaction.recipient = String(converters.byteArrayToBigInteger(byteArray, 40)); // 8
    if (data.recipient)
      this.confirm("recipient", data.recipient, transaction.recipient);
    else {
      if (data.recipientPublicKey)
        this.confirm("recipientPublicKey", heat.crypto.getAccountIdFromPublicKey(data.recipientPublicKey), transaction.recipient);
      else
        this.confirm("recipient", "1739068987193023818", transaction.recipient);
    }

    transaction.amount = String(converters.byteArrayToBigInteger(byteArray, 48)); // 8
    if (data.OrdinaryPayment)
      this.confirm("amount", data.OrdinaryPayment.amountHQT, transaction.amount);
    else
      this.confirm("amount", "0", transaction.amount);

    transaction.fee = String(converters.byteArrayToBigInteger(byteArray, 56)); // 8
    this.confirm("fee", data.fee, transaction.fee);

    transaction.signature = converters.byteArrayToHexString(byteArray.slice(64, 128)); // 64
    transaction.flags = converters.byteArrayToSignedInt32(byteArray, 128); // 4
    transaction.ecBlockHeight = converters.byteArrayToSignedInt32(byteArray, 132); // 4
    transaction.ecBlockId = String(converters.byteArrayToBigInteger(byteArray, 136)); // 8

    var pos: number = 144;
    pos++; // skip the attachmentVersion byte

    var bytes: IByteArrayWithPosition = {
      byteArray: byteArray,
      pos: pos
    };
    if (!this.verify(transaction, bytes, data)) {
      return;
    }

    var position = 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixMessage(bytes);
      this.confirm("Message.message", data.message, appendix.message);
      this.confirm("Message.messageIsText", data.messageIsText, appendix.isText);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixEncryptedMessage(bytes);
      this.confirm("EncryptedMessage.encryptedMessageData",data.encryptedMessageData, appendix.encryptedMessageData);
      this.confirm("EncryptedMessage.encryptedMessageNonce",data.encryptedMessageNonce, appendix.encryptedMessageNonce);
      this.confirm("EncryptedMessage.messageToEncryptIsText",data.messageToEncryptIsText, appendix.isText);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixPublicKeyAnnouncement(bytes);
      this.confirm("PublicKeyAnnouncement.recipientPublicKey",data.recipientPublicKey, appendix.publicKey);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixEncryptToSelfMessage(bytes);
      this.confirm("EncryptToSelfMessage.encryptedMessageData",data.encryptToSelfMessageData, appendix.encryptedMessageData);
      this.confirm("EncryptToSelfMessage.encryptedMessageNonce",data.encryptToSelfMessageNonce, appendix.encryptedMessageNonce);
      this.confirm("EncryptToSelfMessage.messageToEncryptIsText",data.messageToEncryptToSelfIsText, appendix.isText);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixPrivateNameAnnouncement(bytes);
      this.confirm("PrivateNameAnnouncement.privateNameAnnouncement",data.privateNameAnnouncement, appendix.privateNameAnnouncement);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixPrivateNameAssignment(bytes);
      this.confirm("PrivateNameAssignment.privateNameAssignment",data.privateNameAssignment, appendix.privateNameAssignment);
      this.confirm("PrivateNameAssignment.privateNameAssignmentSignature",data.privateNameAssignmentSignature, appendix.signature);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixPublicNameAnnouncement(bytes);
      this.confirm("PublicNameAnnouncement.privateNameAssignment",data.publicNameAnnouncement, appendix.publicNameAnnouncement);
    }
    position <<= 1;
    if ((transaction.flags & position) != 0) {
      let appendix = new AppendixPublicNameAssignment(bytes);
      this.confirm("PublicNameAssignment.publicNameAssignment",data.publicNameAssignment, appendix.publicNameAssignment);
      this.confirm("PublicNameAssignment.publicNameAssignmentSignature",data.publicNameAssignmentSignature, appendix.signature);
    }

    var tmp1 = converters.hexStringToByteArray(transactionBytes);
    var tmp2 = converters.hexStringToByteArray(signature);
    Array.prototype.splice.apply(tmp1, [64,64].concat(tmp2));
    return converters.byteArrayToHexString(tmp1);
  }
}