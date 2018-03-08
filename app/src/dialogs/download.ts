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

// ID,TIME,TYPE,ACCOUNT,ASSET,ASSET_SYMBOL,AMOUNT,AMOUNT_ASSET,PRICE,TOTAL,FEE,MESSAGE
interface HistoryEntry {
  timestamp?: number;
  ID?:string;
  TIME?:string;
  TYPE?:string;
  ACCOUNT?:string;
  AMOUNT?:string;
  ASSET?:string;
  ASSET_SYMBOL?:string;
  //AMOUNT_ASSET?:string;
  PRICE?:string;
  TOTAL?:string;
  FEE?:string;
  MESSAGE?:string;
}

module dialogs {

  export function download($event, account) {

    let $q = <angular.IQService> heat.$inject.get('$q');
    let heatApi = <HeatService> heat.$inject.get('heat');
    let $timeout = <angular.ITimeoutService> heat.$inject.get('$timeout');
    let $rootScope = heat.$inject.get('$rootScope');
    let settings = <SettingsService> heat.$inject.get('settings')
    let assetInfo = <AssetInfoService> heat.$inject.get('assetInfo')
    let format = settings.get(SettingsService.DATEFORMAT_DEFAULT);

    let locals = {
      transactions: {
        total: 0,
        array: [],
        percent: 0,
        done: false
      },
      trades: {
        total: 0,
        array: [],
        percent: 0,
        done: false
      },
      currencies: [],
      symbols:{}
    }

    // kick start transaction downloader
    heatApi.api.getTransactionsForAccountCount(account).then(count => {
      let scopes = []
      for (let i=0; i<count; i+=100) {
        scopes.push([i, i+99]);
      }
      $rootScope.$evalAsync(function () {
        locals.transactions.total = count
      })
      recursiveGetTransactions(account, scopes, function (transaction) {
        $rootScope.$evalAsync(function () {
          if (transaction==null) {
            locals.transactions.percent = 100
            locals.transactions.done = true
            done()
          }
          else {
            locals.transactions.array.push(transaction)
            locals.transactions.percent = Math.round(locals.transactions.array.length/(locals.transactions.total/100))
          }
        })
      })
    })

    // kick start trade downloader
    heatApi.api.getAllAccountTradesCount(account).then(count => {
      let scopes = []
      for (let i=0; i<count; i+=100) {
        scopes.push([i, i+99]);
      }
      $rootScope.$evalAsync(function () {
        locals.trades.total = count
      })
      recursiveGetTrades(account, scopes, function (trade) {
        $rootScope.$evalAsync(function () {
          if (trade==null) {
            locals.trades.percent = 100
            locals.trades.done = true
            done()
          }
          else {
            locals.trades.array.push(trade)
            locals.trades.percent = Math.round(locals.trades.array.length/(locals.trades.total/100))
          }
        })
      })
    })

    function done() {
      if (locals.transactions.done && locals.trades.done) {

        // list duplicates
        console.log('duplicates', collectDuplicates(locals.transactions.array))

        let assets = collectAssets(locals.transactions.array, locals.trades.array)
        getAssetSymbols(assets).then(symbols => {
          $rootScope.$evalAsync(function () {
            assets.forEach(asset => {
              let symbol = symbols[asset].symbol
              locals.currencies.push({
                id: asset,
                symbol: symbol,
                download: createDownloadFunction(asset, symbol)
              })
              locals.symbols[asset] = symbol
            })
          })
        })
      }
    }

    function createDownloadFunction(currency, symbol) {
      return function () {
        let entries = []
        locals.transactions.array.forEach(t => {
          if (filterTransaction(currency, t))
            entries.push(transactionToHistory(currency, t))
        })
        locals.trades.array.forEach(t => {
          if (filterTrade(currency, t))
            entries.push(tradeToHistory(currency, t))
        })
        entries.sort((a,b)=> a.timestamp-b.timestamp)
        let csv = historyToCSV(entries)
        download(csv, account+'.'+symbol+'.csv')
        // dialogs.$mdDialog().cancel()
      }
    }

    function collectAssets(transactions:IHeatTransaction[], trades: IHeatTrade[]): string[] {
      let assets = { "0": 1 }
      transactions.forEach(transaction => {
        let type = transaction.type, subType = transaction.subtype
        if (type==2 && subType==4 || type==2 && subType==3) {  // 'Buy order' || 'Sell order'
          assets[transaction.attachment.asset] = 1
          assets[transaction.attachment.currency] = 1
        }
        if (type==2 && subType==2) {  // Asset Transfer
          assets[transaction.attachment.asset] = 1
        }
      })
      trades.forEach(trade => {
        assets[trade.asset] = 1
        assets[trade.currency] = 1
      })
      return Object.getOwnPropertyNames(assets)
    }

    function collectDuplicates(transactions:IHeatTransaction[]): {[key:string]:number} {
      let dups = {}
      transactions.forEach(transaction => {
        if (typeof dups[transaction.transaction]=="number") {
          dups[transaction.transaction]++
        }
        else {
          dups[transaction.transaction] = 1
        }
      })
      let collect = {}
      Object.getOwnPropertyNames(dups).forEach(name => {
        if (dups[name] > 1) {
          collect[name] = dups[name]
        }
      })
      return collect
    }

    function getAssetSymbols(assets:string[]): Promise<{[key:string]:any}> {
      var promises = []
      var data = {}
      assets.forEach(asset => {
        promises.push(assetInfo.getInfo(asset).then(info=>{
          data[asset] = info
        }))
      })
      return Promise.all(promises).then(()=> data)
    }

    function filterTransaction($currency:string, transaction: IHeatTransaction) {
      if ($currency=="0")
        return true // every txn has a fee in HEAT
      let type = transaction.type, subType = transaction.subtype
      if (type==2 && subType==4 || type==2 && subType==3) {  // 'Buy order' || 'Sell order'
        return transaction.attachment.asset == $currency || transaction.attachment.currency == $currency
      }
      if (type==2 && subType==2) {  // Asset Transfer
        return transaction.attachment.asset == $currency
      }
    }

    function filterTrade($currency:string, trade: IHeatTrade) {
      return trade.currency == $currency || trade.asset == $currency
    }

    /**
     * Will download transactions one batch by one, all transactions are reported back
     * to the reporter function
     *
     * @param account string
     * @param scopes [[from,to]]
     * @param reporter function (transaction)
     */
    function recursiveGetTransactions(account: string, scopes: any[], reporter: (transaction: IHeatTransaction)=>void) {
      let scope = scopes.shift()
      if (!scope) {
        reporter(null)
        return
      }

      let deferred = $q.defer();
      heatApi.api.getTransactionsForAccount(account, scope[0], scope[1]).then(
        transactions => {
          transactions.forEach(transaction => {
            reporter(transaction)
          })
          $timeout(function() {
            recursiveGetTransactions(account, scopes, reporter)
          })
        }
      ).catch(deferred.reject)
      return deferred.promise
    }

    /**
     * Will download trades one batch by one, all trades are reported back to the
     * reporter function
     *
     * @param account string
     * @param scopes [[from,to]]
     * @param reporter function (transaction)
     */
    function recursiveGetTrades(account: string, scopes: any[], reporter: (trade: IHeatTrade)=>void) {
      let scope = scopes.shift()
      if (!scope) {
        reporter(null)
        return
      }

      let deferred = $q.defer();
      heatApi.api.getAllAccountTrades(account, "0", 0, scope[0], scope[1]).then(
        trades => {
          trades.forEach(trade => {
            reporter(trade)
          })
          $timeout(function() {
            recursiveGetTrades(account, scopes, reporter)
          })
        }
      ).catch(deferred.reject)
      return deferred.promise
    }

    function transactionToHistory($currency:string, transaction: IHeatTransaction) {
      let entry: HistoryEntry = {}, type = transaction.type, subType = transaction.subtype
      entry.timestamp = transaction.timestamp
      entry.ID = transaction.transaction
      entry.TIME = dateFormat(utils.timestampToDate(transaction.timestamp), format);
      entry.TYPE = encodeTxType(type, subType)
      if (transaction.sender == account)
        entry.FEE = utils.formatQNT(transaction.fee, 8)
      else
        entry.FEE = "0"
      entry.MESSAGE = heatApi.getHeatMessageContents(transaction);
      entry.ACCOUNT = transaction.sender==account?transaction.recipient:transaction.sender
      entry.AMOUNT = '0';
      entry.ASSET = '';
      // entry.AMOUNT_ASSET = '0';
      entry.PRICE = '';
      entry.TOTAL = '';

      if (type==2 && subType==4) {  // 'Buy order'
        let total = utils.calculateTotalOrderPriceQNT(transaction.attachment.quantity, transaction.attachment.price)
        entry.PRICE = utils.formatQNT(transaction.attachment.price, 8)
        entry.TOTAL = utils.formatQNT(total, 8)
        entry.ASSET = transaction.attachment.asset==$currency?transaction.attachment.asset:transaction.attachment.currency
        entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
      }
      else
      if (type==2 && subType==3) {  // 'Sell order'
        let total = utils.calculateTotalOrderPriceQNT(transaction.attachment.quantity, transaction.attachment.price)
        entry.PRICE = utils.formatQNT(transaction.attachment.price, 8)
        entry.TOTAL = utils.formatQNT(total, 8)
        entry.ASSET = transaction.attachment.asset==$currency?transaction.attachment.asset:transaction.attachment.currency
        entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
      }
      else
      if (type==1 && subType==0) {  // 'Message'
      }
      else
      if (type==0 && subType==0) {  // HEAT payment
        entry.ASSET = "0"
        entry.ASSET_SYMBOL = "HEAT"
        if (transaction.sender == transaction.recipient)
          entry.AMOUNT = "0"  // send to self
        else if (transaction.recipient == account)
          entry.AMOUNT = utils.formatQNT(transaction.amount, 8)  // transfer out
        else
          entry.AMOUNT = "-" + utils.formatQNT(transaction.amount, 8) // transfer in
      }
      else
      if (type==2 && subType==2) {  // Asset Transfer
        entry.ASSET = transaction.attachment.asset
        entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
        if (transaction.sender == transaction.recipient)
          entry.AMOUNT = "0"  // send to self
        else if (transaction.recipient == account)
          entry.AMOUNT = utils.formatQNT(transaction.attachment.quantity, 8)  // transfer out
        else
          entry.AMOUNT = "-" + utils.formatQNT(transaction.attachment.quantity, 8) // transfer in
      }
      else
      if (type==2 && subType==6) {  // 'Cancel buy'
        let quantity = transaction.attachment.cancelledOrderQuantity || "0" // order could possibly not exist
        let price = transaction.attachment.cancelledOrderPrice || "0"
        let total = quantity!="0"&&price!="0"?utils.calculateTotalOrderPriceQNT(quantity, price):"0"
        entry.PRICE = utils.formatQNT(transaction.attachment.price, 8)
        entry.TOTAL = utils.formatQNT(total, 8)
        entry.ASSET = transaction.attachment.cancelledOrderAsset?(transaction.attachment.cancelledOrderAsset==$currency?transaction.attachment.asset:transaction.attachment.currency):''
        entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
      }
      else
      if (type==2 && subType==5) {  // 'Cancel sell'
        let quantity = transaction.attachment.cancelledOrderQuantity || "0" // order could possibly not exist
        let price = transaction.attachment.cancelledOrderPrice || "0"
        let total = quantity!="0"&&price!="0"?utils.calculateTotalOrderPriceQNT(quantity, price):"0"
        entry.PRICE = utils.formatQNT(transaction.attachment.price, 8)
        entry.TOTAL = utils.formatQNT(total, 8)
        entry.ASSET = transaction.attachment.cancelledOrderAsset?(transaction.attachment.cancelledOrderAsset==$currency?transaction.attachment.asset:transaction.attachment.currency):''
        entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
      }
      else
      if (type==4 && subType==0) {  // 'Balance lease'
      }
      else
      if (type==2 && subType==0) { // 'Asset Issuance'
        if (transaction.transaction == $currency) {
          entry.AMOUNT = utils.formatQNT(transaction.attachment.quantity, 8)
        }
      }
      return entry;
    }

    function tradeToHistory($currency:string, trade: IHeatTrade) {
      let entry: HistoryEntry = {}
      entry.timestamp = trade.timestamp
      entry.ID = trade.askOrder+"."+trade.bidOrder
      entry.TYPE = 'Trade'
      entry.TIME = dateFormat(utils.timestampToDate(trade.timestamp), format);
      entry.ACCOUNT = trade.seller==account?trade.buyer:trade.seller
      entry.FEE = "0"
      entry.MESSAGE = ''
      entry.PRICE = '';
      entry.TOTAL = '';
      entry.ASSET = $currency //trade.currency==$currency?trade.asset:trade.currency
      entry.ASSET_SYMBOL = locals.symbols[entry.ASSET]
      if (trade.seller == account && trade.buyer == account) { // sell to self
        entry.AMOUNT = '0';
        // entry.AMOUNT_ASSET = '0';
        // entry.ASSET = $currency
      }
      else {
        let total = utils.calculateTotalOrderPriceQNT(trade.quantity, trade.price)
        entry.PRICE = utils.formatQNT(trade.price, 8)
        entry.TOTAL = utils.formatQNT(total, 8)
        if (trade.currency == $currency) {
          if (trade.buyer == account) {
            entry.AMOUNT = '-'+utils.formatQNT(total, 8)
            // entry.AMOUNT_ASSET = utils.formatQNT(trade.quantity, 8)
          }
          else {
            entry.AMOUNT = utils.formatQNT(total, 8)
            // entry.AMOUNT_ASSET = '-'+utils.formatQNT(trade.quantity, 8)
          }
        }
        else {
          if (trade.buyer == account) {
            entry.AMOUNT = utils.formatQNT(trade.quantity, 8)
            // entry.AMOUNT_ASSET = '-'+utils.formatQNT(total, 8)
          }
          else {
            entry.AMOUNT =  '-'+utils.formatQNT(trade.quantity, 8)
            // entry.AMOUNT_ASSET = '-'+utils.formatQNT(total, 8)
          }
        }
      }
      return entry
    }

    function getSymbol(id) {
      return id // we dont have access to symbols currently, return ID instead
    }

    function encodeTxType(type: number, subType: number): string {
      if (type==2 && subType==4)
        return 'Buy order'
      if (type==2 && subType==3)
        return 'Sell order'
      if (type==1 && subType==0)
        return 'Message'
      if (type==0 && subType==0)
        return 'Transfer'   // HEAT payment
      if (type==2 && subType==2)
        return 'Transfer'   // Asset Transfer
      if (type==2 && subType==6)
        return 'Cancel buy'
      if (type==2 && subType==5)
        return 'Cancel sell'
      if (type==4 && subType==0)
        return 'Balance lease'
      if (type==2 && subType==0)
        return 'Asset Issuance'
      return 'Other'
    }

    function removeCommas(str) {
      return str ? str.replace(/,/g, '') : ''
    }

    function historyToCSV(entries: HistoryEntry[]) {
      var buffer = [];
      buffer.push("ID,TIME,TYPE,ACCOUNT,ASSET,ASSET_SYMBOL,AMOUNT,PRICE,TOTAL,FEE,MESSAGE");
      entries.reverse()
      entries.forEach(history => {
        buffer.push([
          JSON.stringify(history.ID),
          history.TIME,
          history.TYPE,
          history.ACCOUNT,
          history.ASSET,
          history.ASSET_SYMBOL,
          history.AMOUNT,
          // history.AMOUNT_ASSET,
          history.PRICE,
          history.TOTAL,
          history.FEE,
          JSON.stringify(history.MESSAGE)
        ].map(x => removeCommas(x)).join(','))
      })
      return buffer.join('\n')
    }

    function download(content:string, fileName:string) {
      var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
      saveAs(blob, fileName);
    }

    return dialogs.dialog({
      id: 'download',
      title: 'Download account history (CSV)',
      targetEvent: $event,
      okButton: false,
      cancelButton: true,
      locals: locals,
      style: `
        .dialog-download md-progress-linear {
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }
        .dialog-download .md-button {
          text-align: left !important;
          margin-left: 0px !important;
          padding-left: 0px !important;
        }
      `,
      template: `
        <div layout="column" class="dialog-download">
          <div layout="row">Transactions ({{vm.transactions.array.length}})</div>
          <md-progress-linear md-mode="determinate" ng-value="vm.transactions.percent"></md-progress-linear>
          <div layout="row">Trades ({{vm.trades.array.length}})</div>
          <md-progress-linear md-mode="determinate" ng-value="vm.trades.percent"></md-progress-linear>
          <!--<div>
            <p>Total Transactions: {{vm.transactions.total}}</p>
            <p>Count Transactions: {{vm.transactions.array.length}}</p>
            <p>Percent: {{vm.transactions.percent}}</p>
            <p>Total Trades: {{vm.trades.total}}</p>
            <p>Count Trades: {{vm.trades.array.length}}</p>
            <p>Percent: {{vm.trades.percent}}</p>
          </div>-->
          <div>
            <div ng-repeat="currency in vm.currencies">
              <md-button ng-click="currency.download()">Download {{currency.symbol}}.csv</md-button> View
            </div>
          </div>
        </div>
      `
    });
  }
}