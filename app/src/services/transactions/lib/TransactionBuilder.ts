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

interface ITransactionBuilderBroadcastResponse {
  success?: boolean;
  serverError?: string;
  internalError?: string;
  internalTimeout?: boolean;
}

interface ITransactionBuilderSignError {
  code: number;
  description: string;
}

enum TransactionMessageType {
  TO_SELF, TO_RECIPIENT, PUBLIC
}

class TransactionBuilder {

  private $q = <angular.IQService> heat.$inject.get('$q');
  private user = <UserService> heat.$inject.get('user');
  private settings = <SettingsService> heat.$inject.get('settings');
  private heat = <HeatService> heat.$inject.get('heat');

  private _feeHQT: string;
  private _deadline: number = 1440;
  private _message: string;
  private _messageType: TransactionMessageType;
  private _messageIsBinary: boolean = false;
  private _secretPhrase: string;
  private _recipientPublicKey: string;
  private _recipient: string;
  private _attachment: any;
  private _transactionArgs: IHeatCreateTransactionInput;
  private _transactionData: IHeatCreateTransactionOutput;
  private _transactionBytes: string;

  /* Client side calculated transaction full hash, set when `sign` completes */
  public transactionFullHash: string;

  /* Client side calculated transaction id, set when `sign` completes */
  public transactionId: string;

  constructor(private transaction: AbstractTransaction) {}

  public deadline(deadline: number): TransactionBuilder {
    this._deadline = deadline;
    return this;
  }

  public feeNQT(feeHQT: string): TransactionBuilder {
    this._feeHQT = feeHQT;
    return this;
  }

  public secretPhrase(secretPhrase: string): TransactionBuilder {
    this._secretPhrase = secretPhrase;
    return this;
  }

  public recipientPublicKey(recipientPublicKey: string): TransactionBuilder {
    this._recipientPublicKey = recipientPublicKey;
    return this;
  }

  public recipient(recipient: string): TransactionBuilder {
    this._recipient = recipient;
    return this;
  }

  public message(message: string, messageType: TransactionMessageType, isBinary?: boolean): TransactionBuilder {
    this._message = message;
    this._messageType = messageType;
    this._messageIsBinary = isBinary;
    return this;
  }

  /* Accepts a function or an object */
  public attachment(name: string, attachment: any): TransactionBuilder {
    this._attachment = {};
    this._attachment[name] = attachment;
    return this;
  }

  /**
   * Once all properties for this transaction are provided call the `create` method
   * to package the arguments and send them to the `createTransaction` server API.
   * When the call succeeds expect the returned promise to resolve.
   *
   * @returns Promise
   */
  public create(): angular.IPromise<any> {
    var deferred = this.$q.defer();
    try {

      /* could throw an error during encrypting of message */
      this._transactionArgs = this.getCreateTransactionArgs();

      var p = this.heat.api.createTransaction(this._transactionArgs);
      p.then((data: IHeatCreateTransactionOutput) => {
        this._transactionData = data;
        deferred.resolve();
      }).
      catch((error: ServerEngineError) => {
        console.log(error);
        deferred.reject(error);
      });

    } catch (e) {
      console.log(e);
      deferred.reject(e);
    }
    return deferred.promise;
  }

  /* Signs and verifies the unsigned transaction bytes */
  public sign(): angular.IPromise<any> {
    var deferred = this.$q.defer();
    var signature = heat.crypto.signBytes(
      this._transactionData.unsignedTransactionBytes,
        converters.stringToHexString(this._secretPhrase));

    var publicKey = heat.crypto.secretPhraseToPublicKey(this._secretPhrase);
    if (!heat.crypto.verifyBytes(signature, this._transactionData.unsignedTransactionBytes, publicKey)) {
      deferred.reject(<ITransactionBuilderSignError> {
        description: 'Server returned invalid transaction',
        code: 1
      });
    }
    else {
      var payload = this.transaction.verifyAndSignTransactionBytes(
                      this._transactionData.unsignedTransactionBytes,
                      signature, this._transactionArgs);
      if (!payload) {
        deferred.reject(<ITransactionBuilderSignError> {
          description: 'Could not confirm client signature',
          code: 2
        });
      }
      else {
        this._transactionBytes = payload;
        this.transactionFullHash = heat.crypto.calculateFullHash(
          this._transactionData.unsignedTransactionBytes, signature);
        this.transactionId = heat.crypto.calculateTransactionId(this.transactionFullHash);

        deferred.resolve();
      }
    }
    return deferred.promise;
  }

  /* Broadcasts the transaction to the network, this method can be called multiple times */
  public broadcast(): angular.IPromise<ITransactionBuilderBroadcastResponse> {
    var deferred = this.$q.defer();

    var p = this.heat.api.broadcast({ transactionBytes: this._transactionBytes});
    p.then((data: IHeatBroadcastOutput) => {
      if (data.fullHash != this.transactionFullHash) {
        deferred.resolve({
          success: false,
          internalError: 'Fullhash from server does not match expected fullHash'
        });
      }
      else if (data.transaction != this.transactionId) {
        deferred.resolve({
          success: false,
          internalError: 'Transaction id from server does not match expected id'
        });
      }
      else {
        deferred.resolve({
          success: true
        });
      }
    }).catch((error: ServerEngineError) => {
      if (error instanceof InternalServerTimeoutError) {
        deferred.resolve({
          success: false,
          internalTimeout: true
        });
      }
      else {
        deferred.resolve({
          success: false,
          serverError: error.description
        });
      }
    });

    return deferred.promise;
  }

  /**
   * Constructs the arguments for the `createTransaction` server API call.
   * @returns Object with arguments as properties
   */
  private getCreateTransactionArgs(): IHeatCreateTransactionInput {
    var attachment = angular.isFunction(this._attachment) ? this._attachment.call(null) : (this._attachment||{});
    if (!angular.isDefined(this._feeHQT)) {
      throw new Error("You must provide a fee");
    }
    var args: IHeatCreateTransactionInput = {
      fee: this._feeHQT,
      deadline: this._deadline,
      publicKey: heat.crypto.secretPhraseToPublicKey(this._secretPhrase),
      broadcast: false
    };
    angular.extend(args, attachment);
    if (utils.emptyToNull(this._recipientPublicKey)) {
      args.recipientPublicKey = this._recipientPublicKey;
    }
    if (utils.emptyToNull(this._recipient)) {
      args.recipient = this._recipient;
    }
    if (utils.emptyToNull(this._message)) {
      switch (this._messageType) {
        case TransactionMessageType.TO_SELF: {
          angular.extend(args, this.encryptToSelf(this._message));
          break;
        }
        case TransactionMessageType.TO_RECIPIENT: {
          if (!angular.isDefined(args.recipientPublicKey)) {
            throw new Error("You must provide a recipient that has a publickey");
          }
          var publicKey = converters.hexStringToByteArray(args.recipientPublicKey);
          angular.extend(args, this.encryptToRecipient(this._message, args.recipient, publicKey));
          break;
        }
        case TransactionMessageType.PUBLIC: {
          args.message = this._message;
          args.messageIsText = !this._messageIsBinary;
          break;
        }
      }
    }
    return args;
  }

  private encryptToSelf(message: any, isBinary?: boolean): any {
    var publicKey = converters.hexStringToByteArray(heat.crypto.secretPhraseToPublicKey(this._secretPhrase));
    var encrypted = isBinary ?
                    heat.crypto.encryptBinaryNote(message, {"publicKey": publicKey}, this._secretPhrase, true) :
                    heat.crypto.encryptNote(message, {"publicKey": publicKey}, this._secretPhrase);
    return {
      "encryptToSelfMessageData": encrypted.message,
      "encryptToSelfMessageNonce": encrypted.nonce,
      "messageToEncryptToSelfIsText": !isBinary
    };
  }

  private encryptToRecipient(message: any, recipient: string, recipientPublicKey: Array<number>, isBinary?: boolean): any {
    var options: heat.crypto.IEncryptOptions = {
      "account": recipient,
      "publicKey": recipientPublicKey
    };
    var encrypted = isBinary ?
                    heat.crypto.encryptBinaryNote(message, options, this._secretPhrase, true) :
                    heat.crypto.encryptNote(message, options, this._secretPhrase);
    return {
      "encryptedMessageData": encrypted.message,
      "encryptedMessageNonce": encrypted.nonce,
      "messageToEncryptIsText": !isBinary
    };
  }
}