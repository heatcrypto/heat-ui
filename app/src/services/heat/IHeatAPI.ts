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
interface IHeatAPI {

  /**
   * Registers account name through heatledger
   */
  registerAccountName(publicKey: string, captcha: string, name: string, isprivate: boolean, signature: string): angular.IPromise<string>;

  /**
   * Get the state of the server node and network
   */
  getBlockchainStatus():angular.IPromise<IHeatBlockchainStatus>;
  getBlocks(from: number, to: number):angular.IPromise<Array<IHeatBlockCondensed>>;
  getBlock(numericId: string, includeTransactions:boolean ):angular.IPromise<IHeatBlock>;
  getBlockAtHeight(height: number, includeTransactions:boolean ):angular.IPromise<IHeatBlock>;

  /**
   * Returns account public key
   */
  getPublicKey(account: string): angular.IPromise<string>;
  /**
   * Create any type transaction from a JSON document
   */
  createTransaction(input:IHeatCreateTransactionInput): angular.IPromise<IHeatCreateTransactionOutput>;
  /**
   * Broadcast a transaction to the network
   * Transactions can be either send as JSON or as HEX encoded byte string.
   */
  broadcast(param: IHeatBroadcastInput):angular.IPromise<IHeatBroadcastOutput>;
  /**
   * Lists all protocol 1 assets (requires replicator
   */
  getAllAssetProtocol1(from:number,to:number):angular.IPromise<Array<IHeatAssetProtocol1>>;
  /**
   * Finds protocol 1 asset by symbol (requires replicator)
   */
  getAssetProtocol1(symbol: string):angular.IPromise<IHeatAssetProtocol1>;
  /**
   * Find asset by numeric id
   */
  getAsset(asset:string, propertiesAccount:string, propertiesProtocol:number):angular.IPromise<IHeatAsset>;
  /**
   * Find heat asset certification information
   */
  getAssetCertification(asset: string, certifierAccount:string):angular.IPromise<IHeatAssetCertification>;
  /**
   * Lists all assets
   */
  getAssets(propertiesAccount:string,propertiesProtocol:number,from:number,to:number): angular.IPromise<Array<IHeatAsset>>;
  /**
   * Find asset properties by numeric id, properties account and protocol, pass
   * propertiesAccount=0 to return the asset issuers properties.
   */
  getAssetProperties(asset: string, propertiesAccount: string, propertiesProtocol: number):angular.IPromise<IHeatAssetProperties>;
  /**
   * Lists all orders for an account (requires replicator)
   */
  getAccountPairOrders(account: string, currency: string, asset: string, from: number, to: number):angular.IPromise<Array<IHeatOrder>>;
  getAccountPairOrdersCount(account: string, currency: string, asset: string):angular.IPromise<number>;
  /**
   * Lists all orders for an account (requires replicator)
   */
  getAccountAllOrders(account: string, from: number, to: number):angular.IPromise<Array<IHeatOrder>>;
  getAccountAllOrdersCount(account: string):angular.IPromise<number>;
  /**
   * Lists all ask orders by trading pair
   */
  getAskOrders(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  getAskOrdersCount(currency:string, asset:string): angular.IPromise<number>;
  /**
   * Lists all bid orders by trading pair
   */
  getBidOrders(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  getBidOrdersCount(currency:string, asset:string): angular.IPromise<number>;
  /**
   * Lists all ask orders
   */
  getAllAskOrders(from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  /**
   * Lists all bid orders
   */
  getAllBidOrders(from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  /**
   * Lists all ask orders by trading pair for an account
   */
  getAccountAskOrders(account: string,currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  /**
   * Lists all bid orders by trading pair for an account
   */
  getAccountBidOrders(account: string,currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>>;
  /**
   * Lists all trades for a trading pair
   */
  getTrades(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatTrade>>;
  getTradesCount(currency:string, asset:string): angular.IPromise<number>;
  /**
   * Lists all trades for all trading pairs
   */
  getAllTrades(from: number, to: number): angular.IPromise<Array<IHeatTrade>>;
  /**
   * Lists all trades for an account
   */
  getAllAccountTrades(account: string, propertiesAccount: string, propertiesProtocol: number, from: number, to: number): angular.IPromise<Array<IHeatTrade>>;
  /**
   * Lists account trades for a trading pair
   */
  getAccountTrades(account:string, currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatTrade>>;
  getAccountTradesCount(account:string, currency:string, asset:string): angular.IPromise<number>;
  /**
   * Returns account asset balance, balance with asset=0 is your HEAT balance
   */
  getAccountBalance(account: string, asset: string): angular.IPromise<IHeatAccountBalance>;
  getAccountBalanceVirtual(account: string, asset: string, propertiesAccount: string, propertiesProtocol: number): angular.IPromise<IHeatAccountBalance>;

  /**
   * Lists all markets (requires replicator)
   * @param sort string ['change','volume','price','none']
   * @param asc string [true,false]
   * @param propertiesAccountId string
   * @param propertiesProtocol number
   * @param from number
   * @param to number
   */
  getMarketsAll(sort: string, asc:boolean, propertiesAccountId: string, propertiesProtocol: number, from: number, to: number):angular.IPromise<Array<IHeatMarket>>;

  /**
   * Lists all markets for a currency (requires replicator)
   * @see getMarketsAll
   */
  getMarkets(currency: string, sort: string, asc:boolean, propertiesAccountId: string, propertiesProtocol: number, from: number, to: number):angular.IPromise<Array<IHeatMarket>>;

  /**
   * Returns account HEAT balance and all asset balances, balance with asset=0 is your HEAT balance (requires replicator)
   */
  getAccountBalances(account: string, propertiesAccount: string, propertiesProtocol: number, from: number, to: number): angular.IPromise<Array<IHeatAccountBalance>>;

  /**
   * @param sort string [timestamp,recipient,sender,amount,]
   * @param currency string 'all' or id
   */
  getPayments(account: string, currency: string, sort: string, asc: boolean, from: number, to: number): angular.IPromise<Array<IHeatPayment>>;
  /**
   * @param currency string 'all' or id
   */
  getPaymentsCount(account: string, currency: string): angular.IPromise<number>;

  /**
   * Count of all contacts messages (requires replicator)
   */
  getMessagingContactMessagesCount(accountA:string, accountB:string): angular.IPromise<number>;

  /**
   * Lists messages for a contact (requires replicator
   */
  getMessagingContactMessages(accountA:string, accountB:string, from:number, to:number):angular.IPromise<Array<IHeatMessage>>;

  /**
   * Lists latest message contacts (requires replicator)
   */
  getMessagingContacts(account: string, from: number, to: number): angular.IPromise<Array<IHeatMessageContact>>;

  /**
   * Retrieves OHLC chart data for trading pair (requires replicator)
   */
  getOHLCChartData(currency: string, asset: string, window: string): angular.IPromise<IHeatChart>;

  /**
   * Get current mining info for all miners (if secret phrase ommitted) or for a single miner
   */
  getMiningInfo(secretPhrase: string): angular.IPromise<Array<IHeatMiningInfo>>;

  /**
   * Start mining blocks with an account
   */
  startMining(secretPhrase: string): angular.IPromise<IHeatMiningInfo>;

  /**
   * Stop mining blocks with account
   */
  stopMining(secretPhrase: string): angular.IPromise<IHeatMiningInfo>;

  /**
   * Find account by numeric id
   */
  getAccountByNumericId(numericId: string): angular.IPromise<IHeatAccount>;

  /**
   * Lists all transactions for account
   */
  getTransactionsForAccount(account: string, from: number, to: number): angular.IPromise<Array<IHeatTransaction>>;

  /**
   * Count all transactions for account
   */
  getTransactionsForAccountCount(account: string): angular.IPromise<number>;

  /**
   * Lists all transactions for block
   */
  getTransactionsForBlock(block: string, from: number, to: number): angular.IPromise<Array<IHeatTransaction>>;

  /**
   * Count all transactions for block
   */
  getTransactionsForBlockCount(block: string): angular.IPromise<number>;

  /**
   * Lists all transactions
   */
  getTransactionsForAll(from: number, to: number): angular.IPromise<Array<IHeatTransaction>>;

  /**
   * Count all transactions
   */
  getTransactionsForAllCount(): angular.IPromise<number>;

  /**
   * List transactions send from one account to another
   */
  getTransactionsFromTo(sender:string, recipient:string, from:number, to:number): angular.IPromise<Array<IHeatTransaction>>;
  getTransaction(transaction: string): angular.IPromise<IHeatTransaction>;

  /**
   * Search account ids, public keys and email ids. If an exact match is found on public key,
   * account id, public name or private name. Only that one result is returned.
   */
  searchAccounts(query: string, from: number, to: number): angular.IPromise<Array<IHeatAccount>>;
  searchAccountsCount(query: string): angular.IPromise<number>;

  /**
   * Search public names only.
   */
  searchPublicNames(query: string, from: number, to: number): angular.IPromise<Array<IHeatAccount>>;
}
interface IHeatAccount {
  id: string;
  keyHeight: number;
  publicKey: string;
  balance: string;
  unconfirmedBalance: string;
  effectiveBalance: string;
  guaranteedBalance: string;
  currentLessee: string;
  currentLeasingHeightFrom: number;
  currentLeasingHeightTo: number;
  nextLessee: string;
  nextLeasingHeightFrom: number,
  nextLeasingHeightTo: number;
  lessors: Array<string|IHeatLessors>;
  publicName: string;
}
interface IHeatLessors {
  id: string;
  currentLessee: string;
  currentHeightFrom: number;
  currentHeightTo: number;
  nextLessee: string;
  nextHeightFrom: number;
  nextHeightTo: number;
  effectiveBalance: string;
}
interface IHeatMiningInfo {
  /**
   * Returned from startMining and getMiningInfo
   */
  deadline: number;
  /**
   * Returned from startMining and getMiningInfo
   */
  hitTime: number;
  /**
   * Returned from stopMining
   */
  foundAndStopped: boolean;
  /**
   * Returned from stopMining
   */
  stopped: boolean;
  /**
   * Returned from getMiningInfo
   */
  remaining: number;
  /**
   * Returned from getMiningInfo
   */
  account: string;
}
interface IHeatCreateTransactionInput {
  /**
   * Transaction fee in HQT (1 HQT equals 0.00000001 HEAT) default fee is 1 HEAT
   */
  fee: string;
  /**
   * The deadline (in minutes) for the transaction to be confirmed, 1440 minutes maximum
   */
  deadline: number;
  /**
   * The secret passphrase of the account (optional, but transaction neither signed nor broadcast if omitted)
   */
  secretPhrase?: string;
  /**
   * The public key of the account (optional if secretPhrase provided)
   */
  publicKey?: string;
  /**
   * The account ID of the recipient (optional)
   */
  recipient?: string;
  /**
   * The public key of the receiving account (optional, enhances security of a new account)
   */
  recipientPublicKey?: string;
  /**
   * Set to false to prevent broadcasting the transaction to the network (optional)
   */
  broadcast: boolean;
  /**
   * Either UTF-8 text or a string of hex digits (perhaps previously encoded using an arbitrary algorithm) to be converted into a bytecode with a maximum length of one kilobyte
   */
  message?: string;
  /**
   * False if the message is a hex string, otherwise the message is text (optional)
   */
  messageIsText?: boolean;
  /**
   * Either UTF-8 text or a string of hex digits to be compressed (unless compressMessageToEncrypt is false) and converted into a bytecode with a maximum length of one kilobyte
   */
  messageToEncrypt?: string;
  /**
   * False if the message to encrypt is a hex string, otherwise the message to encrypt is text (optional)
   */
  messageToEncryptIsText?: string;
  /**
   * Already encrypted data which overrides messageToEncrypt if provided (optional)
   */
  encryptedMessageData?: string;
  /**
   * A unique 32-byte number which cannot be reused (optional unless encryptedMessageData is provided)
   */
  encryptedMessageNonce?: string;
  /**
   * Either UTF-8 text or a string of hex digits to be compressed (unless compressMessageToEncryptToSelf is false) and converted into a one kilobyte maximum bytecode then encrypted with AES, then sent to the sending account (optional)
   */
  messageToEncryptToSelf?: string;
  /**
   * False if the message to self-encrypt is a hex string, otherwise the message to encrypt is text (optional)
   */
  messageToEncryptToSelfIsText?: boolean;
  /**
   * Already encrypted data which overrides messageToEncryptToSelf if provided (optional)
   */
  encryptToSelfMessageData?: string;
  /**
   * A unique 32-byte number which cannot be reused (optional unless encryptToSelfMessageData is provided)
   */
  encryptToSelfMessageNonce?: string;
  /**
   * 8 byte numeric name hash (optional, announces non-public name to your account)
   */
  privateNameAnnouncement?: string;
  /**
   * Account name, UTF-8 min length 3, max length 100 (optional, announces public name to your account)
   */
  publicNameAnnouncement?: string;
  /**
   * 8 byte numeric name hash (optional, assigns non-public name to recipient account)
   */
  privateNameAssignment?: string;
  /**
   * Private name assignment signature (required when privateNameAssignment was given, see /tools/privatename/signature for details)
   */
  privateNameAssignmentSignature?: string;
  /**
   * Account name, UTF-8 min length 3, max length 100 (optional, assigns public name to recipient account)
   */
  publicNameAssignment?: string;
  /**
   * Public name assignment signature (required when publicNameAssignment was given, see /tools/publicname/signature for details)
   */
  publicNameAssignmentSignature?: string;

  // attachements
  EffectiveBalanceLeasing?: IHeatCreateEffectiveBalanceLeasing;
  AskOrderCancellation?: IHeatCreateAskOrderCancellation;
  BidOrderCancellation?: IHeatCreateBidOrderCancellation;
  AskOrderPlacement?: IHeatCreateAskOrderPlacement;
  BidOrderPlacement?: IHeatCreateBidOrderPlacement;
  AssetIssuance?: IHeatCreateAssetIssuance;
  AssetIssueMore?: IHeatCreateAssetIssueMore;
  AssetTransfer?: IHeatCreateAssetTransfer;
  OrdinaryPayment?: IHeatCreateOrdinaryPayment;
  ArbitraryMessage?: IHeatCreateArbitraryMessage;
  WhitelistMarket?: IHeatCreateWhitelistMarket;
}
interface IHeatCreateEffectiveBalanceLeasing {
  period: number;
}
interface IHeatCreateAskOrderCancellation {
  orderId: string;
}
interface IHeatCreateBidOrderCancellation {
  orderId: string;
}
interface IHeatCreateAskOrderPlacement {
  currencyId: string;
  assetId: string;
  quantity: string;
  price: string;
  expiration: number;
}
interface IHeatCreateBidOrderPlacement {
  currencyId: string;
  assetId: string;
  quantity: string;
  price: string;
  expiration: number;
}
interface IHeatCreateAssetIssuance {
  descriptionUrl: string;
  descriptionHash: string;
  quantityQNT: string;
  decimals: number;
  dillutable: boolean;
}
interface IHeatCreateAssetIssueMore {
  assetId: string;
  quantity: string;
}
interface IHeatCreateAssetTransfer {
  assetId: string;
  quantity: string;
}
interface IHeatCreateOrdinaryPayment {
  amountHQT: string;
}
interface IHeatCreateArbitraryMessage {}
interface IHeatCreateWhitelistMarket {
  currencyId: string;
  assetId: string;
}

interface IHeatCreateTransactionOutput {
  /**
   * SHA-256 hash of the transaction signature (only when secretPhrase sent to server) ,
   */
  signatureHash?: string;
  /**
   * The ID of the newly created transaction (only when secretPhrase sent to server) ,
   */
  transaction?: string;
  /**
   * The full hash of the signed transaction (only when secretPhrase sent to server) ,
   */
  fullHash?: string;
  /**
   * The signed transaction bytes (only when secretPhrase sent to server) ,
   */
  transactionBytes?: string;
  /**
   * True if the transaction was broadcast, false otherwise ,
   */
  broadcasted?: boolean;
  /**
   * A transaction object ,
   */
  transactionJSON?: IHeatTransaction;
  /**
   * he unsigned transaction bytes as HEX string
   */
  unsignedTransactionBytes?: string;
}

interface IHeatTransaction {
  /**
   * The transaction type
   */
  type: number;
  /**
   * The transaction subtype
   */
  subtype: number;
  /**
   * The time (in seconds since 24 november 2013 00:00 UTC) of the transaction
   */
  timestamp: number;
  /**
   * The deadline (in minutes) for the transaction to be confirmed
   */
  deadline: number;
  /**
   * The public key of the sending account for the transaction
   */
  senderPublicKey: string;
  /**
   * The account number of the recipient, if applicable
   */
  recipient: string;
  /**
   * The amount in HQT (1 HQT equals 0.00000001 HEAT) of the transaction
   */
  amount: string;
  /**
   * The fee in HQT (1 HQT equals 0.00000001 HEAT) of the transaction
   */
  fee: string;
  /**
   * The digital signature of the transaction
   */
  signature: string;
  /**
   * A SHA-256 hash of the transaction signature
   */
  signatureHash: string;
  /**
   * The full hash of the signed transaction
   */
  fullHash: string;
  /**
   * The ID of the newly created transaction
   */
  transaction: string;
  /**
   * An object containing any additional data needed for the transaction, if applicable
   */
  attachment: any;
  /**
   * The account ID of the sender
   */
  sender: string;
  /**
   *  The height of the block in the blockchain
   */
  height: number;
  /**
   * The transaction version number
   */
  version: number;
  /**
   * The economic clustering block ID
   */
  ecBlockId: string;
  /**
   * The economic clustering block height
   */
  ecBlockHeight: number;
  /**
   * A zero-based index giving the order of the transaction in its block
   */
  transactionIndex: number;
  /**
   * Number of transaction confirmations
   */
  confirmations: number;
  /**
   * The ID of the block containing the transaction
   */
  block: string;
  /**
   * The timestamp (in seconds since 24 november 2013 00:00 UTC) of the block
   */
  blockTimestamp: number;

  recipientPublicKey: string;
  messageBytes: string;
  messageIsText: boolean;
  messageIsEncrypted: boolean;
  messageIsEncryptedToSelf: boolean;
  recipientPublicName: string;
  senderPublicName: string;
}
interface IHeatBroadcastInput {
  /**
   * The bytecode of a signed transaction (optional)
   */
  transactionBytes?: string;
  /**
   * The transaction object (optional if transactionBytes provided)
   */
  transactionJSON?: Object;
}
interface IHeatBroadcastOutput {
  /**
   * The full hash of the signed transaction ,
   */
  fullHash: string;
  /**
   * The transaction ID
   */
  transaction: string;
}
interface IHeatAsset {
  /**
   * The number of the account that issued the asset
   */
  account: string;
  accountPublicName: string;
  /**
   * The asset ID
   */
  asset: string;
  /**
   * The total asset quantity (in QNT) in existence
   */
  quantityQNT: string;
  /**
   * The number of decimal places used by the asset
   */
  decimals: number;
  /**
   * HTTP/HTTPS url pointing to the asset description file
   */
  descriptionUrl: string;
  /**
   * SHA256 hash of description document contents as UTF-8 (hash is HEX string)
   */
  descriptionHash: string;
  /**
   * True in case new assets can later be issued by the asset issuer
   */
  dillutable: boolean;

  properties?: string;
}
interface IHeatAssetCertification {
  /**
   * Asset id
   */
  asset: string;
  /**
   * Certification status [true,false]
   */
  certified: boolean;
  /**
   * Certified asset assigned symbol
   */
  symbol: string;
  /**
   * Certified asset assigned name
   */
  name: string;
  /**
   * Certifier account id
   */
  certifierAccount: string;
}

interface IHeatAssetProtocol1 {
  asset: string;
  decimals: number;
  name: string;
  symbol: string;
}

interface IHeatAssetProperties extends IHeatAsset {
  /**
   * Asset properties account
   */
  propertiesAccount: string;
  /**
   * Asset properties protocol
   */
  propertiesProtocol: number;
  /**
   * Asset properties based on protocol and account id
   */
  properties: string;
  /**
   * Asset properties timestamp
   */
  timestamp: number;
}

interface IHeatOrder {
  /**
   * The expiration time (in seconds since 24 november 2013 00:00 UTC)
   */
  expiration: number;
  /**
   * The ID of the order
   */
  order: string;
  /**
   * The ID of the currency with which we are paying (BID order) or which we will be receiving (ASK order)
   */
  currency: string;
  /**
   * The ID of the asset being bought or sold
   */
  asset: string;
  /**
   * The account number associated with the order
   */
  account: string;
  /**
   * The order quantity (in QNT, 1 share is 100000000 QNT)
   */
  quantity: string;
  /**
   * The unconfirmed order quantity (in QNT)
   */
  unconfirmedQuantity: string;
  /**
   * The order price (given in currency units, could be either HQT if currency is HEAT or QNT if currency is an asset)
   */
  price: string;
  /**
   * The block height of the order transaction
   */
  height: number;
  /**
   * A zero-based index giving the order of the transaction in its block
   */
  transactionIndex: number;
  /**
   * Order type, either ask or bid = ['ask', 'bid']
   */
  type: string;
  /**
   * Indicates an unconfirmed cancellation is pending
   */
  cancelled: boolean;
  /**
   * This is an unconfirmed or pending order
   */
  unconfirmed: boolean;
  /**
   * Order is currently not valid, but might become valid in the future.
   */
  currentlyNotValid: boolean;
}
interface IHeatTrade {
  /**
   * The ID of the block that contains the trade (0 for unconfirmed trades)
   */
  block: string;
  /**
   * The height of the block that contains the trade (0 for unconfirmed trades)
   */
  height: number;
  /**
   * The trade timestamp (in seconds since 24 november 2013 00:00 UTC)
   */
  timestamp: number;
  /**
   * The currency ID
   */
  currency: string;
  /**
   * The asset ID
   */
  asset: string;
  /**
   * The ask order ID
   */
  askOrder: string;
  /**
   * The bid order ID
   */
  bidOrder: string;
  /**
   * The ask order height (0 for unconfirmed orders)
   */
  askOrderHeight: number;
  /**
   * The bid order height (0 for unconfirmed orders)
   */
  bidOrderHeight: number;
  /**
   * Numeric ID of the seller account
   */
  seller: string;
  /**
   * Numeric ID of the buyer account
   */
  buyer: string;
  /**
   * The trade quantity (in QNT)
   */
  quantity: string;
  /**
   * The trade price (in QNT in case currency is an asset, in HQT in case currency is HEAT) (1 HQT equals 0.00000001 HEAT)
   */
  price: string;
  /**
   * Wheter this is a BUY trade (false in case of a SELL trade)
   */
  isBuy: boolean;
  /**
   * Currency properties based on protocol and account id (blank for all but 'list account trades')
   */
  currencyProperties: string;
  /**
   * Asset properties based on protocol and account id (blank for all but 'list account trades')
   */
  assetProperties: string;
}
interface IHeatAccountBalance {
  /**
   * Asset ID, asset=0 is your HEAT balance all others are assets you own
   */
  id: string;
  /**
   * Account balance in QNT (1 QNT equals 0.00000001)
   */
  balance: string;
  /**
   * Unconfirmed balance in QNT (1 QNT equals 0.00000001)
   */
  unconfirmedBalance: string;
  /**
   * Virtual balance in QNT (1 QNT equals 0.00000001)
   */
  virtualBalance: string;
  /**
   * Currency properties based on protocol and account id
   */
  properties: string;
  /**
   * Currency decimals
   */
  decimals: number;
}

interface IHeatMarket {
  /**
   * Currency id
   */
  currency: string;
  /**
   * Asset id
   */
  asset: string;
  /**
   * Last price
   */
  lastPrice: string;
  /**
   * 24 hour change percentage (double)
   */
  hr24Change: string;
  /**
   * 24 hour high
   */
  hr24High: string;
  /**
   * 24 hour low
   */
  hr24Low: string;
  /**
   * 24 hour currency volume
   */
  hr24CurrencyVolume: string;
  /**
   * 24 hour asset volume
   */
  hr24AssetVolume: string;
  /**
   * Total amount of all ask orders
   */
  askOrderTotal: string;
  /**
   * Total amount of all bid orders
   */
  bidOrderTotal: string;
  /**
   * Currency properties based on protocol and account id
   */
  currencyProperties: string;
  /**
   * Asset properties based on protocol and account id
   */
  assetProperties: string;
  /**
   * Currency decimals
   */
  currencyDecimals: number;
  /**
   * Asset decimals
   */
  assetDecimals: number;
}
interface IHeatChart {
  currency: string;
  asset: string;
  window: string;
  timestamp: string;
  data: Array<string|IHeatChartData>;
}
interface IHeatChartData {
  /**
   * The number timestamp in HEAT epoch format
   */
  timestamp: number;
  /**
   * The string or number if < 9007199254740991
   */
  avg: string;
  low: string;
  high: string;
  vol: string;
  open: string;
  close: string;
}
interface IHeatPayment {
  currency: string;
  quantity: string;
  sender: string;
  recipient: string;
  senderPrivateName: string;
  recipientPrivateName: string;
  senderPublicName: string;
  recipientPublicName: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  timestamp: number;
  blockId: string;
  messageBytes: string;
  messageIsText: boolean;
  messageIsEncrypted: boolean;
  messageIsEncryptedToSelf: boolean;
}
interface IHeatBlockchainStatus {
  isScanning: boolean;
  cumulativeDifficulty: string;
  numberOfBlocks: number;
  version: string;
  lastBlock: string;
  lastBlockTimestamp: number;
  application: string;
  lastBlockchainFeederHeight: number;
  time: number;
  lastBlockchainFeeder: string;
  /**
   * Amount of HEAT in genesis block (in HQT, 1 HQT is 0.00000001 HEAT)
   * */
  initialCoinSupply: string;
  /**
   * Current total amount of HEAT (in HQT, 1 HQT is 0.00000001 HEAT)
   */
  currentCoinSupply: string;
}
interface IHeatBlockCondensed {
  totalAmountHQT: string;
  posRewardHQT: string;
  popRewardHQT: string,
  generator: string;
  numberOfTransactions: number;
  totalFeeHQT: string;
  block: string;
  height: number;
  timestamp: number;
}
interface IHeatBlock {
  previousBlockHash: string;
  payloadLength: number;
  totalAmountHQT: string;
  posRewardHQT: string;
  popRewardHQT: string,
  generationSignature: string;
  generator: string;
  generatorPublicName: string;
  generatorPublicKey: string;
  baseTarget: string;
  payloadHash: string;
  nextBlock: string;
  numberOfTransactions: number;
  blockSignature: string;
  transactions: Array<string|IHeatTransaction>;
  version: number;
  totalFeeHQT: string;
  previousBlock: string;
  cumulativeDifficulty: string;
  block: string;
  height: number;
  timestamp: number;
}
interface IHeatMessageContact {
  account: string;
  privateName: string;
  publicName: string;
  publicKey: string;
  timestamp: number;
}
interface IHeatMessage {
  transaction: string;
  sender: string;
  recipient: string;
  senderPrivateName: string;
  recipientPrivateName: string;
  senderPublicName: string;
  recipientPublicName: string;
  senderPublicKey: string;
  recipientPublicKey: string;
  timestamp: number;
  blockId: string;
  messageBytes: string;
  messageIsText: boolean;
  messageIsEncrypted: boolean;
  messageIsEncryptedToSelf: boolean;
}
