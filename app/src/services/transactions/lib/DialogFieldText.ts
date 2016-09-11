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
class DialogFieldText extends AbstractDialogField {

  _rows: number = 0;

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-text');
  }

  rows(rows: number) {
    this._rows = rows;
    return this;
  }
}

@Component({
  selector: 'fieldText',
  inputs: ['label','value','changed','f'],
  template: `
    <ng-form name="userForm" layout="row">
      <md-input-container class="md-block" flex ng-class="{'async-validator-pending':userForm.userField.$pending}">
        <label>{{vm.label}}</label>
        <input ng-if="!vm.f._rows" field-validator="vm.f" ng-model="vm.value" ng-change="vm.changed()"
            name="userField" ng-required="vm.f._required" ng-readonly="vm.f._readonly" ng-trim="false">
        <textarea ng-if="vm.f._rows" field-validator="vm.f" ng-model="vm.value" ng-change="vm.changed()"
            name="userField" ng-required="vm.f._required" ng-readonly="vm.f._readonly"
            ng-trim="false" rows="{{vm.f._rows}}"></textarea>
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
class DialogFieldTextComponent {}