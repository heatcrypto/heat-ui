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
class HeatAPI implements IHeatAPI {

  /* transaction fees used in transaction dialogs and other places */
  static fee = {
    standard: utils.convertToQNT('0.01'),
    assetIssue: utils.convertToQNT('500.00'),
    assetIssueMore: utils.convertToQNT('0.01'),
    whitelistMarket: utils.convertToQNT('10.00'),
  };

  constructor(private heat: HeatService,
              private user: UserService,
              private $q: angular.IQService) {}

  registerAccountName(publicKey: string, captcha: string, name: string, isprivate: boolean, signature: string): angular.IPromise<string> {
    return this.heat.get(`/register/now/${publicKey}/${captcha}/${name}/${isprivate}/${signature}`, 'value');
  }

  getBlockchainStatus():angular.IPromise<IHeatBlockchainStatus> {
    return this.heat.get('/blockchain/status');
  }

  getBlocks(from: number, to: number):angular.IPromise<Array<IHeatBlockCondensed>> {
    return this.heat.get(`/blockchain/blocks/${from}/${to}/null`); // @see api, null means no transaction data at all
  }

  getBlock(numericId: string, includeTransactions:boolean = true):angular.IPromise<IHeatBlock> {
    return this.heat.get(`/blockchain/block/${numericId}/${includeTransactions}`);
  }

  getBlockAtHeight(height: number, includeTransactions:boolean ):angular.IPromise<IHeatBlock> {
    return this.heat.get(`/blockchain/block/height/${height}/${includeTransactions}`);
  }

  getAccountBlocks(account:string, from: number, to: number):angular.IPromise<Array<IHeatBlockCondensed>> {
    return this.heat.get(`/blockchain/blocks/account/${account}/${from}/${to}/null`);
  }

  getAccountBlocksCount(account: string):angular.IPromise<number> {
    return this.heat.get(`/blockchain/blocks/account/count/${account}`, "count");
  }

  getPublicKey(account: string): angular.IPromise<string> {
    var deferred = this.$q.defer();
    this.heat.get(`/account/publickey/${account}`,"value").then((publicKey)=> {
      var test = heat.crypto.getAccountIdFromPublicKey(publicKey);
      if (test != account) {
        console.log("Public key returned from server does not match account");
        deferred.reject();
      }
      else {
        deferred.resolve(publicKey);
      }
    },deferred.reject);
    return <angular.IPromise<string>> deferred.promise;
  }

  createTransaction(input:IHeatCreateTransactionInput): angular.IPromise<IHeatCreateTransactionInput> {
    console.log("CreateTransaction",input);
    var arg = { value: JSON.stringify(input) };
    return this.heat.post('/tx/create', arg);
  }

  broadcast(param: IHeatBroadcastInput):angular.IPromise<IHeatBroadcastOutput> {
    var arg = {};
    if (angular.isDefined(param.transactionJSON)) {
      arg['transactionJSON'] = JSON.stringify(param.transactionJSON);
    }
    if (angular.isDefined(param.transactionBytes)) {
      arg['transactionBytes'] = param.transactionBytes;
    }
    return this.heat.post('/tx/broadcast', arg);
  }

  getAllAssetProtocol1(from:number,to:number):angular.IPromise<Array<IHeatAssetProtocol1>> {
    return this.heat.get(`/exchange/assets/protocol1/${from}/${to}`);
  }

  getAssetProtocol1(symbol: string):angular.IPromise<IHeatAssetProtocol1> {
    return this.heat.get(`/exchange/asset/protocol1/${symbol}`);
  }

  getAsset(asset:string, propertiesAccount:string, propertiesProtocol:number):angular.IPromise<IHeatAsset> {
    return this.heat.get(`/exchange/asset/properties/${asset}/${propertiesAccount}/${propertiesProtocol}`);
  }

  getAssetCertification(asset: string, certifierAccount:string):angular.IPromise<IHeatAssetCertification> {
    return this.heat.get(`/exchange/asset/certification/${asset}/${certifierAccount}`);
  }

  getAssets(propertiesAccount:string,propertiesProtocol:number,from:number,to:number): angular.IPromise<Array<IHeatAsset>> {
    return this.heat.get(`/assets/${propertiesAccount}/${propertiesProtocol}/${from}/${to}`);
  }

  getAssetProperties(asset: string, propertiesAccount: string, propertiesProtocol: number):angular.IPromise<IHeatAssetProperties> {
    return this.heat.get(`/exchange/asset/properties/${asset}/${propertiesAccount}/${propertiesProtocol}`);
  }

  getAccountPairOrders(account: string, currency: string, asset: string, from: number, to: number):angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/account/pair/${account}/${currency}/${asset}/${from}/${to}`);
  }

  getAccountPairOrdersCount(account: string, currency: string, asset: string):angular.IPromise<number> {
    return this.heat.get(`/order/account/pair/count/${account}/${currency}/${asset}`, "count");
  }

  getAccountAllOrders(account: string, from: number, to: number):angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/account/all/${account}/${from}/${to}`);
  }

  getAccountAllOrdersCount(account: string):angular.IPromise<number> {
    return this.heat.get(`/order/account/all/count/${account}`, "count");
  }

  getAskOrders(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/pair/asks/${currency}/${asset}/${from}/${to}`);
  }

  getAskOrdersCount(currency:string, asset:string): angular.IPromise<number> {
    return this.heat.get(`/order/pair/asks/count/${currency}/${asset}`, "count");
  }

  getBidOrders(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/pair/bids/${currency}/${asset}/${from}/${to}`);
  }

  getBidOrdersCount(currency:string, asset:string): angular.IPromise<number> {
    return this.heat.get(`/order/pair/bids/count/${currency}/${asset}`, "count");
  }

  getAllAskOrders(from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/asks/${from}/${to}`);
  }

  getAllBidOrders(from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/bids/${from}/${to}`);
  }

  getAccountAskOrders(account: string,currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/account/pair/asks/${account}/${currency}/${asset}/${from}/${to}`);
  }

  getAccountBidOrders(account: string,currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatOrder>> {
    return this.heat.get(`/order/account/pair/bids/${account}/${currency}/${asset}/${from}/${to}`);
  }

  getTrades(currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatTrade>> {
    return this.heat.get(`/trade/${currency}/${asset}/${from}/${to}`);
  }

  getTradesCount(currency:string, asset:string): angular.IPromise<number> {
    return this.heat.get(`/trade/count/${currency}/${asset}`, "count");
  }

  getAllTrades(from: number, to: number): angular.IPromise<Array<IHeatTrade>> {
    return this.heat.get(`/trade/all/${from}/${to}`);
  }

  getAllAccountTrades(account: string, propertiesAccount: string, propertiesProtocol: number, from: number, to: number): angular.IPromise<Array<IHeatTrade>> {
    return this.heat.get(`/trade/account/${account}/${propertiesAccount}/${propertiesProtocol}/${from}/${to}`);
  }

  getAccountTrades(account:string, currency:string, asset:string, from: number, to: number): angular.IPromise<Array<IHeatTrade>> {
    return this.heat.get(`/trade/account/pair/${account}/${currency}/${asset}/${from}/${to}`);
  }

  getAccountTradesCount(account:string, currency:string, asset:string): angular.IPromise<number> {
    return this.heat.get(`/trade/account/pair/count/${account}/${currency}/${asset}`, "count");
  }

  getAccountBalance(account: string, asset: string): angular.IPromise<IHeatAccountBalance> {
    return this.heat.get(`/account/balance/${account}/${asset}`);
  }

  getAccountBalanceVirtual(account: string, asset: string, propertiesAccount: string, propertiesProtocol: number): angular.IPromise<IHeatAccountBalance> {
    return this.heat.get(`/account/balance/virtual/${account}/${asset}/${propertiesAccount}/${propertiesProtocol}`);
  }

  getMarketsAll(sort: string, asc:boolean, propertiesAccountId: string, propertiesProtocol: number, from: number, to: number):angular.IPromise<Array<IHeatMarket>> {
    return this.heat.get(`/exchange/markets/all/${sort}/${asc}/${propertiesAccountId}/${propertiesProtocol}/${from}/${to}`);
  }

  getMarkets(currency: string, sort: string, asc:boolean, propertiesAccountId: string, propertiesProtocol: number, from: number, to: number):angular.IPromise<Array<IHeatMarket>> {
    return this.heat.get(`/exchange/markets/${currency}/${sort}/${asc}/${propertiesAccountId}/${propertiesProtocol}/${from}/${to}`);
  }

  getMarket(currency: string, asset: string, propertiesAccountId: string, propertiesProtocol: number):angular.IPromise<IHeatMarket> {
    return this.heat.get(`/exchange/market/${currency}/${asset}/${propertiesAccountId}/${propertiesProtocol}`);
  }

  getAccountBalances(account: string, propertiesAccount: string, propertiesProtocol: number, from: number, to: number): angular.IPromise<Array<IHeatAccountBalance>> {
    return this.heat.get(`/account/balances/${account}/${propertiesAccount}/${propertiesProtocol}/${from}/${to}`);
  }

  getPayments(account: string, currency: string, sort: string, asc: boolean, from: number, to: number): angular.IPromise<Array<IHeatPayment>> {
    return this.heat.get(`/account/payments/${account}/${currency}/${sort}/${asc}/${from}/${to}`);
  }

  getPaymentsCount(account: string, currency: string): angular.IPromise<number> {
    return this.heat.get(`/account/payments/count/${account}/${currency}`,"count");
  }

  getMessagingContactMessagesCount(accountA:string, accountB:string): angular.IPromise<number> {
    return this.heat.get(`/messages/contact/count/${accountA}/${accountB}`,"count");
  }

  getMessagingContactMessages(accountA:string, accountB:string, from:number, to:number):angular.IPromise<Array<IHeatMessage>> {
    return this.heat.get(`/messages/contact/${accountA}/${accountB}/${from}/${to}`);
  }

  getMessagingContacts(account: string, from: number, to: number): angular.IPromise<Array<IHeatMessageContact>> {
    return this.heat.get(`/messages/latest/${account}/${from}/${to}`);
  }

  getOHLCChartData(currency: string, asset: string, window: string): angular.IPromise<IHeatChart> {
    return this.heat.get(`/exchange/chartdata/${currency}/${asset}/${window}`);
  }

  getMiningInfo(secretPhrase: string): angular.IPromise<Array<IHeatMiningInfo>> {
    return this.heat.post('/mining/info?api_key=secret', {secretPhrase:secretPhrase}, false, null, true);
  }

  startMining(secretPhrase: string): angular.IPromise<IHeatMiningInfo> {
    return this.heat.post('/mining/start?api_key=secret', {secretPhrase:secretPhrase}, false, null, true);
  }

  stopMining(secretPhrase: string): angular.IPromise<IHeatMiningInfo> {
    return this.heat.post('/mining/stop?api_key=secret', {secretPhrase:secretPhrase}, false, null, true);
  }

  getAccountByNumericId(numericId: string): angular.IPromise<IHeatAccount> {
    return this.heat.get(`/account/find/${numericId}`);
  }

  getTransaction(transaction: string): angular.IPromise<IHeatTransaction> {
    return this.heat.get(`/blockchain/transaction/${transaction}`);
  }

  getTransactionsForAccount(account: string, from: number, to: number): angular.IPromise<Array<IHeatTransaction>> {
    return this.heat.get(`/blockchain/transactions/account/${account}/${from}/${to}`);
  }

  getTransactionsForAccountCount(account: string): angular.IPromise<number> {
    return this.heat.get(`/blockchain/transactions/account/count/${account}`,"count");
  }

  getTransactionsForBlock(block: string, from: number, to: number): angular.IPromise<Array<IHeatTransaction>> {
    return this.heat.get(`/blockchain/transactions/block/${block}/${from}/${to}`);
  }

  getTransactionsForBlockCount(block: string): angular.IPromise<number> {
    return this.heat.get(`/blockchain/transactions/block/count/${block}`,"count");
  }

  getTransactionsFromTo(sender:string, recipient:string, from:number, to:number): angular.IPromise<Array<IHeatTransaction>> {
    return this.heat.get(`/blockchain/transactions/list/${sender}/${recipient}/${from}/${to}`);
  }

  getTransactionsForAll(from: number, to: number): angular.IPromise<Array<IHeatTransaction>> {
    return this.heat.get(`/blockchain/transactions/all/${from}/${to}`);
  }

  getTransactionsForAllCount(): angular.IPromise<number> {
    return this.heat.get("/blockchain/transactions/all/count","count");
  }

  searchAccounts(query: string, from: number, to: number): angular.IPromise<Array<IHeatAccount>> {
    return this.heat.get(`/search/accounts/${query}/${from}/${to}`);
  }

  searchAccountsCount(query: string): angular.IPromise<number> {
    return this.heat.get(`/search/accounts/count/${query}`, "count");
  }

  searchPublicNames(query: string, from: number, to: number): angular.IPromise<Array<IHeatAccount>> {
    return this.heat.get(`/account/search/0/${query}/${from}/${to}`);
  }
}
