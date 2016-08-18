///<reference path='AbstractDialogField.ts'/>
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
class DialogFieldMoney extends AbstractDialogField {

  private _precision: number = 8;
  private _symbol: string = 'FIM';

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default);
    this.selector('field-money');
    this.parse((value) => {
      if (value == '') return '';
      if (!utils.isNumber(value)) return undefined;
      return utils.convertToNQT(value, this._precision);
    });
    this.formatter((value) => {
      if (value === undefined || value == '') return undefined;
      return utils.convertNQT(value, this._precision);
    });
    this.formatter((value) => {
      if (value === undefined || value == '') return undefined;
      return utils.commaFormat(value);
    });
  }

  precision(precision: number): DialogFieldMoney {
    this._precision = precision;
    return this;
  }

  symbol(symbol: string): DialogFieldMoney {
    this._symbol = symbol;
    return this;
  }
}

@Component({
  selector: 'fieldMoney',
  inputs: ['label','value','changed','f'],
  template: `
    <ng-form name="userForm">
      <md-input-container class="md-block" ng-class="{'async-validator-pending':userForm.userField.$pending}">
        <label>{{vm.label}}<span ng-if="vm.f._symbol"> ({{vm.f._symbol}})</span></label>
        <input field-validator="vm.f" ng-model="vm.value" ng-change="vm.changed()"
            name="userField" ng-required="vm.f._required" ng-readonly="vm.f._readonly">
        <md-progress-linear md-mode="indeterminate" ng-if="userForm.userField.$pending"></md-progress-linear>
        <div ng-messages="userForm.userField.$error" ng-if="userForm.userField.$dirty">
          <div ng-messages-include="error-messages"></div>
          <div ng-repeat="errorMessage in vm.f.errorMessages"
               ng-message-exp="errorMessage.type">{{ errorMessage.text }}</div>
        </div>
      </md-input-container>
    </ng-form>
  `
})
class DialogFieldMoneyComponent {}