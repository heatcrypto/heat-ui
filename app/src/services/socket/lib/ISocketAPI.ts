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
interface ISocketAPI {
  getAccount(account: string, request?: IGetAccountRequest): angular.IPromise<IGetAccountResponse>;
  getAccountBlocks(account: string, request? :IGetAccountBlocksRequest): angular.IPromise<Array<IBlock>>; // blocks
  getBlocks(request?: IGetBlocksRequest): angular.IPromise<Array<IBlock>>; // blocks
  getAlias(request: IGetAliasRequest): angular.IPromise<IAlias>;
  getAliasCount(account: string): angular.IPromise<number>; // numberOfAliases
  getAliases(request: IGetAliasesRequest): angular.IPromise<Array<IAlias>>; // aliases
  getAliasesLike(request: IGetAliasesLikeRequest): angular.IPromise<Array<IAlias>>; // aliases
  getAccountBlockCount(account: string): angular.IPromise<number>; // numberOfBlocks
  getBlockchainStatus(): angular.IPromise<IGetBlockchainStatusResponse>;
  getBlockchainTransactions(account?: string, request?: IGetBlockchainTransactionsRequest): angular.IPromise<Array<ITransaction>>; // transactions
  getUnconfirmedTransactions(account?: string): angular.IPromise<Array<IUnconfirmedTransaction>>; // unconfirmedTransactions
  getAccountTransactionCount(account: string, request?: IGetAccountTransactionCountRequest): angular.IPromise<number>; // numberOfTransactions
  getTransactionCount(): angular.IPromise<number>; // numberOfTransactions
  // searchAccountIdentifiers(query: string, request?: ISearchAccountIdentifiersRequest): angular.IPromise<Array<ISearchAccountIdentifiersResponse>>; // accounts
  broadcastTransaction(transactionBytes: string, request?: IBroadcastTransactionRequest): angular.IPromise<IBroadcastTransactionResponse>;
 	getVirtualAskOrderCount(asset: string, request?: IGetVirtualOrderCountRequest): angular.IPromise<number>; // askOrderCount
	getVirtualBidOrderCount(asset: string, request?: IGetVirtualOrderCountRequest): angular.IPromise<number>; // bidOrderCount
	getVirtualAskOrders(asset: string, request?: IGetVirtualOrdersRequest): angular.IPromise<Array<IVirtualOrder>>; // askOrders
	getVirtualBidOrders(asset: string, request?: IGetVirtualOrdersRequest): angular.IPromise<Array<IVirtualOrder>>; // bidOrders
	getVirtualTradeCount(asset: string, request?: IGetVirtualTradeCountRequest): angular.IPromise<number>; // tradeCount
	getVirtualTrades(asset: string, request?: IGetVirtualTradesRequest): angular.IPromise<Array<IVirtualTrade>>; // trades
  getAsset(asset: string, includeCounts?: boolean): angular.IPromise<IAsset>; // includeCounts must become 'true'
  getVirtualChartData(asset: string, window: number): angular.IPromise<IGetVirtualChartDataResponse>;
  getNamespacedAlias(account: string, aliasName?: string, alias?: string): angular.IPromise<INamespacedAlias>;
  getNamespacedAliases(account: string, request?: IGetNamespacedAliasesRequest): angular.IPromise<Array<INamespacedAlias>>; // aliases
  getNamespacedAliasesCount(account: string, filter?: string): angular.IPromise<number>; // count
}

interface IGetNamespacedAliasesRequest {
  account?: string;
  filter?: string;
  firstIndex?: number;
  lastIndex?: number;
  /** @options 'height', 'name' @default 'name' */
  sortBy?: string;
  /** @default false */
  sortAsc?: boolean;
}

interface INamespacedAlias {
  account: string;
  accountRS: string;
  accountName: string;
  accountColorId: string;
  accountColorName: string;
  accountEmail: string;
  aliasName: string;
  aliasURI: string;
  timestamp: number;
  alias: string;
}

interface IGetVirtualChartDataResponse {
  data: Array<Array<string>>;
  decimals: number;
  name: string;
}

interface IAsset {
  orderFeePercentage: number;
  tradeFeePercentage: number;
  account: string;
  accountRS: string;
  accountName: string;
  accountColorId: string;
  accountColorName: string;
  accountEmail: string;
  name: string;
  description: string;
  decimals: number;
  quantityQNT: string;
  asset: string;
  /* @requires getAsset(.., includeCounts=true) */
  numberOfTrades: number;
  /* @requires getAsset(.., includeCounts=true) */
  numberOfTransfers: number;
  /* @requires getAsset(.., includeCounts=true) */
  numberOfAccounts: number;
  /** @returns Number asset type 0=normal 1=private */
  type: number;
}

interface IVirtualTrade {
  quantityQNT: string;
  priceNQT: string;
  asset: string;
  timestamp: number;
  askOrder: string;
  bidOrder: string;
  seller: string;
  sellerRS: string;
  sellerName: string;
  sellerColorId: string;
  sellerColorName: string;
  sellerEmail: string;
  buyer: string;
  buyerRS: string;
  buyerName: string;
  buyerColorId: string;
  buyerColorName: string;
  buyerEmail: string;
  height: number;
  /** @returns String 'buy' or 'sell' */
  tradeType: string;
  confirmations: number;
  /** @returns String asset name */
  name: string;
  decimals: number;
  /** @returns Number asset type 0=normal 1=private */
  type: number;
  issuer: string;
  issuerRS: string;
  issuerName: string;
  issuerColorId: string;
  issuerColorName: string;
  issuerEmail: string;
}

interface IGetVirtualTradesRequest {
  asset?: string;
  account?: string;
  firstIndex?: number;
  lastIndex?: number;
}

interface IGetVirtualTradeCountRequest {
  asset?: string;
  account?: string;
}

interface IVirtualOrder {
  order: string;
  quantityQNT: string;
  priceNQT: string;
  height: number;
  confirmations: number;
  accountRS: string;
  /** @returns String 'ask' or 'bid' */
  type: string;
  transactionIndex: number;
}

interface IGetVirtualOrdersRequest {
  asset?: string;
  account?: string;
  firstIndex?: number;
  lastIndex?: number;
}

interface IGetVirtualOrderCountRequest {
  asset?: string;
  account?: string
}

interface IGetAccountTransactionCountRequest {
  account?: string;
  type?: number;
  subtype?: number;
}

interface IBroadcastTransactionRequest {
  transactionBytes?: string;
  transactionJSON?: string;
  prunableAttachmentJSON?: string;
}

interface IBroadcastTransactionResponse {
  transaction: string;
  fullHash: string;
}

// interface ISearchAccountIdentifiersRequest {
//   query?: string;
//   accountColorId?: string;
//   firstIndex?: number;
//   lastIndex?: number;
// }

// interface ISearchAccountIdentifiersResponse {
//   accountName: string;
//   accountColorId: string;
//   accountColorName: string;
//   accountEmail: string;
//   account: string;
//   accountRS: string;
// }

interface IGetBlockchainTransactionsRequest {
  account?: string;
  timestamp?: number;
  type?: number;
  subtype?: number;
  firstIndex?: number;
  lastIndex?: number;
  numberOfConfirmations?: number;
  withMessage?: boolean;
  phasedOnly?: boolean;
  nonPhasedOnly?: boolean;
}

/* JSONData.putAccount(JSONObject json, String name, long accountId) */
interface IAccount {
  accountName?: string;
  accountColorId?: string;
  accountColorName?: string;
  accountEmail?: string;
  account?: string;
  accountRS?: string;
}

interface IGetAccountRequest {
  account?: string;
  includeLessors?: boolean;
  includeAssets?: boolean;
  includeAssetDetails?: boolean;
  includeCurrencies?: boolean;
  includeEffectiveBalance?: boolean;
}

interface IGetAccountResponse extends IAccountBalance {
  accountName?: string;
  accountColorId?: string;
  accountColorName?: string;
  accountEmail?: string;
  account?: string;
  accountRS?: string;
  publicKey?: string;
  name?: string;
  description?: string;
  currentLessee?: string;
  currentLeasingHeightFrom?: number;
  currentLeasingHeightTo?: number;
  nextLessee?: string;
  nextLeasingHeightFrom?: number;
  nextLeasingHeightTo?: number;
  lessors?: Array<string>;
  lessorsRS?: Array<string>;
  lessorsInfo?: Array<ILessor>;
  assetBalances?: Array<IAccountAssetBalance>;
  unconfirmedAssetBalances?: Array<IAccountAssetUnconfirmedBalance>;
}

interface IGetAccountBlocksRequest {
  account?: string;
  timestamp?: number;
  firstIndex?: number;
  lastIndex?: number;
  includeTransactions?: boolean;
}

interface IGetBlocksRequest {
  firstIndex?: number;
  lastIndex?: number;
  includeTransactions?: boolean;
}

interface IGetAliasesRequest {
  timestamp?: number;
  account?: string;
  firstIndex?: number;
  lastIndex?: number;
}

interface IGetAliasRequest {
  alias?: string;
  aliasName?: string;
}

interface IGetAliasesLikeRequest {
  account?: string;
  aliasPrefix?: string;
  firstIndex?: number;
  lastIndex?: number;
}

interface IGetBlockchainStatusResponse {
  application: string;
  version: string;
  time: number;
  nxtversion: string;
  lastBlock: string;
  cumulativeDifficulty: string;
  numberOfBlocks: string;
  lastBlockchainFeeder: string;
  lastBlockchainFeederHeight: number;
  isScanning: boolean;
  maxRollback: number;
  currentMinRollbackHeight: number;
  isTestnet: boolean;
  maxPrunableLifetime: number;
  includeExpiredPrunable: number;
}

/* JSONData mappings */

interface IAlias {
  accountName: string;
  accountColorId: string;
  accountColorName: string;
  accountEmail: string;
  account: string;
  accountRS: string;
  aliasName: string;
  aliasURI: string;
  timestamp: number;
  alias: string;
  priceNQT?: string;
  buyer?: string;
}

interface IAccountBalance {
  balanceNQT: string;
  unconfirmedBalanceNQT: string;
  forgedBalanceNQT: string;
  effectiveBalanceNXT?: string;
  guaranteedBalanceNQT?: string;
}

interface ILessor {
  currentLesseeName?: string;
  currentLesseeColorId?: string;
  currentLesseeColorName?: string;
  currentLesseeEmail?: string;
  currentLessee: string;
  currentLesseeRS: string;
  currentHeightFrom?: number;
  currentHeightTo?: number;
  effectiveBalanceNXT?: string;
  nextLesseeName?: string;
  nextLesseeColorId?: string;
  nextLesseeColorName?: string;
  nextLesseeEmail?: string;
  nextLessee: string;
  nextLesseeRS: string;
  nextHeightFrom?: number;
  nextHeightTo?: number;
}

interface IAccountAssetBalance {
  asset: string;
  balanceQNT: string;
  name: string;
  decimals: number;
}

interface IAccountAssetUnconfirmedBalance {
  asset: string;
  unconfirmedBalanceQNT: string;
}

interface IBlock {
  block: string;
  height: number;
  generatorName?: string;
  generatorColorId?: string;
  generatorColorName?: string;
  generatorEmail?: string;
  generator: string;
  generatorRS: string;
  generatorPublicKey: string;
  timestamp: number;
  numberOfTransactions: number;
  totalAmountNQT: string;
  totalFeeNQT: string;
  payloadLength: number;
  version: number;
  baseTarget: string;
  cumulativeDifficulty: string;
  previousBlock: string;
  nextBlock: string;
  payloadHash: string;
  generationSignature: string;
  previousBlockHash: string;
  blockSignature: string;
  transactions: Array<ITransaction>;
  totalPOSRewardNQT: string;
}

interface IUnconfirmedTransaction {
  type: number;
  subtype: number;
  phased: boolean;
  timestamp: number;
  deadline: number;
  senderPublicKey: string;
  recipientName?: string;
  recipientColorId?: string;
  recipientColorName?: string;
  recipientEmail?: string;
  recipient: string;
  recipientRS: string;
  amountNQT: string;
  feeNQT: string;
  referencedTransactionFullHash: string;
  signature: string;
  signatureHash: string;
  fullHash: string;
  transaction: string;
  attachment?: any;
  senderName?: string;
  senderColorId?: string;
  senderColorName?: string;
  senderEmail?: string;
  sender: string;
  senderRS: string;
  height: number;
  version: number;
  ecBlockId: string;
  ecBlockHeight: number;
}

interface ITransaction extends IUnconfirmedTransaction {
  block: string;
  confirmations: number;
  blockTimestamp: number;
  transactionIndex: number;
}