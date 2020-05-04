///<reference path='AbstractDialogField.ts'/>
/*
 * The MIT License (MIT)
 * Copyright (c) 2020 Heat Ledger Ltd.
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
class DialogFieldSwitcher extends AbstractDialogField {

  _trueLabel: string = "YES"
  _falseLabel: string = "NO"

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-switcher');
  }

  valueLabels(trueLabel: string, falseLabel: string) {
    this._trueLabel = trueLabel;
    this._falseLabel = falseLabel;
    return this;
  }
}

@Component({
  selector: 'fieldSwitcher',
  inputs: ['label', 'value', 'changed', 'f'],
  template: `
    <ng-form name="userForm" layout="row" ng-show="vm.f._visible">
      <label>{{vm.label}}</label>
      <!--<input ng-if="!vm.f._rows" field-validator="vm.f" ng-model="vm.value" ng-change="vm.changed()"
          name="userField" ng-required="vm.f._required" ng-readonly="vm.f._readonly" ng-trim="false" ng-disabled="vm.f._disabled">-->

      <div>
        <md-switch ng-model="vm.value" ng-change="vm.changed()"
            name="userField" ng-required="vm.f._required" ng-readonly="vm.f._readonly" ng-trim="false" ng-disabled="vm.f._disabled"
            class="md-primary">
          <span ng-show="vm.value">{{vm.f._trueLabel|| 'YES'}}</span>
          <span ng-hide="vm.value">{{vm.f._falseLabel || 'NO'}}</span>
        </md-switch>
      </div>

<!--      <md-progress-linear md-mode="indeterminate" ng-if="userForm.userField.$pending"></md-progress-linear>-->
      <div ng-messages="userForm.userField.$error" ng-if="userForm.userField.$dirty">
        <div ng-messages-include="error-messages"></div>
        <div ng-repeat="errorMessage in vm.f.errorMessages" ng-message-exp="errorMessage.type">{{ errorMessage.text }}</div>
      </div>
    </ng-form>
  `
})
class DialogFieldSwitcherComponent {
}
