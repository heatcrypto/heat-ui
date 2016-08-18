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

class SocketAPI implements ISocketAPI {

  constructor(private socket: ISocket) {}

  getAccount(account: string, request?: IGetAccountRequest): angular.IPromise<IGetAccountResponse> {
    request = request || {};
    request.account = account;
    ['includeLessors','includeAssets','includeCurrencies','includeEffectiveBalance'].forEach((key) => {
      if (!angular.isDefined(request[key])) {
        request[key] = false;
      }
    });
    return this.socket.callAPIFunction('getAccount', request);
  }

  getAccountBlocks(account: string, request? :IGetAccountBlocksRequest): angular.IPromise<Array<IBlock>> {
    request = request || {};
    request.account = account;
    return this.socket.callAPIFunction('getAccountBlocks', request, 'blocks');
  }

  getBlocks(request?: IGetBlocksRequest): angular.IPromise<Array<IBlock>> {
    return this.socket.callAPIFunction('getBlocks', request, 'blocks');
  }

  getAlias(request: IGetAliasRequest): angular.IPromise<IAlias> {
    return this.socket.callAPIFunction('getAlias', request);
  }

  getAliasCount(account: string): angular.IPromise<number> {
    return this.socket.callAPIFunction('getAliasCount', {account:account}, 'numberOfAliases');
  }

  getAliases(request: IGetAliasesRequest): angular.IPromise<Array<IAlias>> {
    return this.socket.callAPIFunction('getAliases', request, 'aliases');
  }

  getAliasesLike(request: IGetAliasesLikeRequest): angular.IPromise<Array<IAlias>> {
    return this.socket.callAPIFunction('getAliasesLike', request, 'aliases');
  }

  getAccountBlockCount(account: string): angular.IPromise<number> {
    return this.socket.callAPIFunction('getAccountBlockCount', {account:account}, 'numberOfBlocks');
  }

  getBlockchainStatus(): angular.IPromise<IGetBlockchainStatusResponse> {
    return this.socket.callAPIFunction('getBlockchainStatus', {});
  }

  getBlockchainTransactions(account?: string, request?: IGetBlockchainTransactionsRequest): angular.IPromise<Array<ITransaction>> {
    request = request || {};
    request.account = account;
    return this.socket.callAPIFunction('getBlockchainTransactions', request, 'transactions');
  }

  getUnconfirmedTransactions(account?: string): angular.IPromise<Array<IUnconfirmedTransaction>> {
    var request: any = {};
    if (account) {
      request.account = account;
    }
    return this.socket.callAPIFunction('getUnconfirmedTransactions', request, 'unconfirmedTransactions');
  }

  getAccountTransactionCount(account: string, request?: IGetAccountTransactionCountRequest): angular.IPromise<number> {
    request = request || {};
    request.account = account;
    return this.socket.callAPIFunction('getAccountTransactionCount', request, 'numberOfTransactions');
  }

  getTransactionCount(): angular.IPromise<number> {
    return this.socket.callAPIFunction('getTransactionCount', {}, 'numberOfTransactions');
  }

  // searchAccountIdentifiers(query: string, request?: ISearchAccountIdentifiersRequest): angular.IPromise<Array<ISearchAccountIdentifiersResponse>> {
  //   request = request || {};
  //   request.query = query;
  //   if (!angular.isDefined(request.firstIndex)) {
  //     request.firstIndex = 0;
  //   }
  //   if (!angular.isDefined(request.lastIndex)) {
  //     request.lastIndex = 15;
  //   }
  //   return this.socket.callAPIFunction('searchAccountIdentifiers', request, 'accounts');
  // }

  broadcastTransaction(transactionBytes: string, request?: IBroadcastTransactionRequest): angular.IPromise<IBroadcastTransactionResponse> {
    request = request || {};
    request.transactionBytes = transactionBytes;
    return this.socket.callAPIFunction('broadcastTransaction', request);
  }

  getVirtualAskOrderCount(asset: string, request?: IGetVirtualOrderCountRequest): angular.IPromise<number> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualAskOrderCount', request, 'askOrderCount');
  }

	getVirtualBidOrderCount(asset: string, request?: IGetVirtualOrderCountRequest): angular.IPromise<number> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualBidOrderCount', request, 'bidOrderCount');
  }

	getVirtualAskOrders(asset: string, request?: IGetVirtualOrdersRequest): angular.IPromise<Array<IVirtualOrder>> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualAskOrders', request, 'askOrders');
  }

	getVirtualBidOrders(asset: string, request?: IGetVirtualOrdersRequest): angular.IPromise<Array<IVirtualOrder>> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualBidOrders', request, 'bidOrders');
  }

	getVirtualTradeCount(asset: string, request?: IGetVirtualTradeCountRequest): angular.IPromise<number> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualTradeCount', request, 'tradeCount');
  }

	getVirtualTrades(asset: string, request?: IGetVirtualTradesRequest): angular.IPromise<Array<IVirtualTrade>> {
    request = request || {};
    request.asset = asset;
    return this.socket.callAPIFunction('getVirtualTrades', request, 'trades');
  }

  getAsset(asset: string, includeCounts?: boolean): angular.IPromise<IAsset> {
    var request: any = { asset: asset };
    if (typeof includeCounts == 'boolean' && includeCounts) {
      request.includeCounts = 'true';
    }
    return this.socket.callAPIFunction('getAsset', request);
  }

  getVirtualChartData(asset: string, window: number): angular.IPromise<IGetVirtualChartDataResponse> {
    var request: any = { asset: asset, window: window };
    return this.socket.callAPIFunction('getVirtualChartData', request);
  }

  getNamespacedAlias(account: string, aliasName?: string, alias?: string): angular.IPromise<INamespacedAlias> {
    var request: any = { account: account };
    if (angular.isDefined(aliasName)) {
      request.aliasName = aliasName;
    }
    else if (angular.isDefined(alias)) {
      request.alias = alias;
    }
    else {
      throw new Error('Must provide either aliasName or alias');
    }
    return this.socket.callAPIFunction('getNamespacedAlias', request);
  }

  getNamespacedAliases(account: string, request?: IGetNamespacedAliasesRequest): angular.IPromise<Array<INamespacedAlias>> {
    request = request || { account: account };
    request.account = account;
    return this.socket.callAPIFunction('getNamespacedAliases', request, 'aliases');
  }

  getNamespacedAliasesCount(account: string, filter?: string): angular.IPromise<number> {
    var request: any = {};
    if (angular.isString(account)) {
      request.account = account;
    }
    if (angular.isString(filter)) {
      request.filter = filter;
    }
    return this.socket.callAPIFunction('getNamespacedAliasesCount', request, 'count');
  }
}