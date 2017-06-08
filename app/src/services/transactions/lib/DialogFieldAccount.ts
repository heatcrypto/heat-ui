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
class DialogFieldAccount extends AbstractDialogField {

  private heat = <HeatService> heat.$inject.get('heat');
  private settings = <SettingsService> heat.$inject.get('settings');
  private user = <UserService> heat.$inject.get('user');
  private $q = <angular.IQService> heat.$inject.get('$q');

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-account');
  }

  search(query: string) {
    return this.heat.api.searchPublicNames(query, 0, 100);
  }
}

@Component({
  selector: 'fieldAccount',
  inputs: ['label','value','changed','f'],
  styles: [`
  field-account md-input-container {
    padding-bottom: 0px !important;
  }
  `],
  template: `
    <ng-form name="userForm" ng-show="vm.f._visible">
      <md-autocomplete
        ng-required="vm.f._required"
        ng-readonly="vm.f._readonly"
        md-input-name="userField"
        md-floating-label="{{vm.label}}"
        md-min-length="1"
        md-items="item in vm.f.search(vm.searchText)"
        md-item-text="item.publicName||item.id"
        md-search-text="vm.searchText"
        md-selected-item-change="vm.selectedItemChange()"
        md-search-text-change="vm.searchTextChange()"
        md-selected-item="vm.selectedItem"
        ng-disabled="vm.f._disabled">
        <md-item-template>
          <div layout="row" flex>
            <span>{{item.publicName}}</span>
            <span flex></span>
            <span>{{item.id}}</span>
          </span>
        </md-item-template>
        <md-not-found>
          No matches found.
        </md-not-found>
        <div ng-messages="userForm.userField.$error" ng-if="userForm.userField.$dirty">
          <div ng-messages-include="error-messages"></div>
          <div ng-repeat="errorMessage in vm.f.errorMessages"
               ng-message-exp="errorMessage.type">{{ errorMessage.text }}</div>
        </div>
      </md-autocomplete>
    </ng-form>
  `
})
class DialogFieldAccountComponent {
  f: any;
  selectedItem: any;
  searchText: string;

  constructor() {
    this.searchText = this.f.value;
  }

  selectedItemChange() {
    this.f.value = this.selectedItem ? this.selectedItem.id : '';
  }

  searchTextChange() {
    this.f.value = this.searchText;
  }
}