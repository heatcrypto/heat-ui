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
module dialogs {
  export function blockDetails($event, blockId) {

    let $q = <angular.IQService> heat.$inject.get('$q');
    let heatApi = <HeatService> heat.$inject.get('heat');
    let deferred = $q.defer();

    heatApi.api.getBlock(blockId, true).then((response) => {
      let sumofamounts = new Big("0");
      response.transactions.forEach(function (transaction) {
        sumofamounts = sumofamounts.add(new Big((<IHeatTransaction>transaction).amount));
      });

      dialogs.dialog({
        id: 'blockDetails',
        title: 'Block details',
        targetEvent: $event,
        cancelButton: false,
        locals: {
          blockId: blockId,
          height: response.height,
          baseTarget: response.baseTarget,
          numberOfTransactions: response.numberOfTransactions,
          generator: response.generator,
          posRewardHQT: response.posRewardHQT,
          popRewardHQT: response.popRewardHQT,
          sumofamounts: utils.commaFormat(utils.formatQNT(sumofamounts.toString(),8))+' HEAT',
          transactions: response.transactions,
          showTransactionDetails: ($event, transaction) => {
            dialogs.transactionDetails($event, transaction);
          }
        },
        style: `
         .dialog-block-details td {
            padding: 8px;
         }
         .dialog-block-details ul {
            list-style-type: none;
            padding-left: 0px;
            margin-left: 0px;
         }
         .dialog-block-details ul li {
            padding-bottom: 5px;
         }
         .dialog-block-details .link-block {
            cursor: pointer;
            color: #3b5998;
            text-decoration: underline;
          }
        `,
        template: `
           <div layout="column" class="dialog-block-details">
             <table>
               <tr><td>Block id</td><td>{{vm.blockId}}</td></tr>
               <tr><td>Block height</td><td>{{vm.height}}</td></tr>
               <tr><td>Base target</td><td>{{vm.baseTarget}}</td></tr>
               <tr><td>Number of transactions</td><td>{{vm.numberOfTransactions}}</td></tr>
               <tr><td>Generator</td><td>{{vm.generator}}</td></tr>
               <tr><td>POS reward</td><td>{{vm.posRewardHQT}}</td></tr>
               <tr><td>POP reward</td><td>{{vm.popRewardHQT}}</td></tr>
               <tr><td>Total HEAT transferred</td><td>{{vm.sumofamounts}}</td></tr>
               <tr ng-if="vm.transactions.length"><td>Transactions</td>
                <td>
                  <ul>
                    <li ng-repeat="trans in vm.transactions" ng-click="vm.showTransactionDetails($event, trans)" class="link-block">{{trans.transaction}}</li>
                  </ul>
                </td>
               </tr>
             </table>
           </div>
         `
      }).then(deferred.resolve, deferred.reject);
    });
    return deferred.promise;
  }
}
