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
  private numbersOnly = /^[0-9]+$/;
  searchText: string;

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-account');
  }

  search(query: string) {
    let deferred = this.$q.defer();
    this.heat.api.searchPublicNames(query, 0, 100, true).then(accounts => {
      accounts = accounts ? accounts : []
      accounts.forEach(account => {
        if (this.numbersOnly.test(account.publicName)) {
          account.publicName = '';
        }
      });
      if (accounts.length > 0) {
        deferred.resolve(accounts);
      } else if (this.numbersOnly.test(query)) {
        this.heat.api.getAccountByNumericId(query, true).then(account => {
          deferred.resolve(account ? [account] : []);
        }, deferred.reject);
      } else {
        //find by public or private name
        this.heat.api.findAccountByName(query, true).then(account => {
          if (!account) {
            deferred.resolve([])
            return
          }
          if (account.publicName == account.id) {
            //account has the private name. If user has entered the private name we should display it
            account["calculatedName"] = query
          }
          deferred.resolve([account]);
        }, deferred.reject);
      }
    }, deferred.reject);
    return deferred.promise;
  }

  setSearchText(value) {
    this.searchText = value;
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
        md-delay="1000"
        md-items="item in vm.f.search(vm.f.searchText)"
        md-item-text="item.calculatedName || item.publicName || item.id"
        md-search-text="vm.f.searchText"
        md-selected-item-change="vm.selectedItemChange()"
        md-search-text-change="vm.searchTextChange()"
        md-selected-item="vm.selectedItem"
        md-autoselect
        ng-disabled="vm.f._disabled">
        <md-item-template>
          <div layout="row" flex class="monospace-font">
            <span>{{item.calculatedName || item.publicName || ''}}</span>
            <span flex></span>
            <span>{{item.id}}</span>
          </span>
        </md-item-template>
        <md-not-found>
          No matches found
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

  constructor() {
  }

  $onInit() {
    this.f.searchText = this.f.value;
  }

  selectedItemChange() {
    this.f.value = this.selectedItem ? this.selectedItem.id : '';
  }

  searchTextChange() {
    this.f.value = this.f.searchText;
  }

}
