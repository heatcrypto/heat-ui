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
@Component({
  selector: 'accountIdentifier',
  inputs: ['account'],
  template: `
    <div>
      <!--<md-tooltip>
        <div layout="column" flex layout-padding layout-align="center center">
          <div>Send message to {{vm.label}}</div>
          <div>{{ vm.identifier }}</div>
          <md-button class="md-primary">Message</md-button>
        </div>
      </md-tooltip>-->
      <span>{{ vm.label }}</span>
    </div>
  `
})
@Inject('settings','user')
class AccountIdentifierComponent {

  /* @inputs */
  account: any; /* can be either a string in RS format or an IAccount type of object */

  /* Displayed label */
  label: string;

  constructor(settings: SettingsService, user:UserService) {
    var accountRS, accountName, accountEmail;
    if (angular.isObject(this.account)) {
      if (angular.isString(this.account.accountRS)) {
        accountRS = this.account.accountRS;
        if (angular.isString(this.account.accountEmail) && this.account.accountEmail != accountRS) {
          accountEmail = this.account.accountEmail;
        }
        if (angular.isString(this.account.accountName)) {
          accountName = this.account.accountName;
        }
      }
    }
    else if (angular.isString(this.account)) {
      accountRS = this.account;
    }
    else {
      accountRS = 'anonymous';
    }

    /* if there is a name for an account use that*/
    if (accountName || accountEmail) {
      this.label = accountEmail || accountName;
    }
    else {
      this.label = accountRS;
    }
  }
}