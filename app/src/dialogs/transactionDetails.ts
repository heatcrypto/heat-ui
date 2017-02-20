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
  export function transactionDetails($event, transaction: IHeatTransaction) {

    let settings: SettingsService = <SettingsService> heat.$inject.get('settings');

    dialogs.dialog({
      id: 'transactionDetails',
      title: 'Transaction details',
      targetEvent: $event,
      cancelButton: false,
      locals: {
        transactions: transaction
        /*date: dateFormat(utils.timestampToDate(transaction.timestamp), settings.get(SettingsService.DATEFORMAT_DEFAULT)),
        amount: utils.commaFormat(utils.convertToQNTf(transaction.amount.toString())) + ' HEAT',
        source: transaction.sender,
        destination: transaction.recipient,
        transactionId: transaction.transaction,
        confirmed: transaction.confirmations ? 'YES' : 'NO'*/
      },
      style: `
        .dialog-transaction-details td {
          padding: 8px;
        }
      `,
      template: `
        <div layout="column" class="dialog-transaction-details">
          <b>Transactions</b>
          <json-formatter json="vm.transactions" open="1"></json-formatter>
          <!--<table>
            <tr><td>Time</td><td>{{vm.date}}</td></tr>
            <tr><td>Amount</td><td>{{vm.amount}}</td></tr>
            <tr><td>Source</td><td>{{vm.source}}</td></tr>
            <tr><td>Destination</td><td>{{vm.destination}}</td></tr>
            <tr><td>Transaction ID</td><td>{{vm.transactionId}}</td></tr>
            <tr><td>Confirmed</td><td>{{vm.confirmed}}</td></tr>
          </table>-->
        </div>
      `
    })
  }
}
