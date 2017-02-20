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
  export function generatorDetails($event, generatorId) {

    let $q = <angular.IQService> heat.$inject.get('$q');
    let heatApi = <HeatService> heat.$inject.get('heat');
    let user = <UserService> heat.$inject.get('user');
    let settings: SettingsService = <SettingsService> heat.$inject.get('settings');
    let deferred = $q.defer();

    $q.all({
      account: heatApi.api.getAccountByNumericId(generatorId),
      accountBalance: heatApi.api.getAccountBalanceVirtual(generatorId, "0", "0", 1),
      payments: heatApi.api.getPayments(generatorId, 'all', 'amount', true, 0, 100)
    }).then((values) => {
      dialogs.dialog({
        id: 'generatorDetails',
        title: 'Generator details',
        targetEvent: $event,
        cancelButton: false,
        locals: {
          generatorId: generatorId,
          accountDetails: values['account'],
          accountBalanceDetails: values['accountBalance'],
          paymentsDetails: values['payments']
        },
        style: `
        `,
        template: `
        <div layout="column" class="dialog-generator-details">
          <b>Generator {{generatorId}}</b>
          <json-formatter json="vm.accountDetails" open="1"></json-formatter>
          <b>Account</b>
          <json-formatter json="vm.accountBalanceDetails" open="1"></json-formatter>
          <b>Account Balance</b>
          <json-formatter json="vm.accountBalanceDetails" open="1"></json-formatter>
          <b>Payments</b>
          <json-formatter json="vm.paymentsDetails" open="0"></json-formatter>
        </div>
      `
      }).then(deferred.resolve, deferred.reject);
    });

    return deferred.promise;
  }
}
