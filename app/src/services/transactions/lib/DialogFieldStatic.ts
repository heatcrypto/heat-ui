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
class DialogFieldStatic extends AbstractDialogField {

  _scrollable: boolean;

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-static');
  }

  scrollable(scrollable: boolean) {
    this._scrollable = scrollable;
    return this
  }
}

@Component({
  selector: 'fieldStatic',
  inputs: ['label','value','changed','f'],
  styles: [`
    ng-form .scrollable-field {
      max-height: 160px;
      font-family: monospace;
      overflow: scroll;
    }
  `],
  template: `
    <ng-form name="userForm" layout="row" ng-show="vm.f._visible">
      <md-input-container class="md-block" flex ng-class="{'async-validator-pending':userForm.userField.$pending}">
        <label ng-if="vm.label">{{vm.label}}</label>
        <p ng-if="!vm.f._scrollable">{{vm.value}}</p>
        <textarea ng-if="vm.f._scrollable" class="scrollable-field" readonly>{{vm.value}}</textarea>
      </md-input-container>
    </ng-form>
  `
})
class DialogFieldStaticComponent {}
