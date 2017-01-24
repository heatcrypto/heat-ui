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
interface DialogFieldAssetAssetInfo {
  symbol: string;
  name: string;
  id: string;
  decimals: number;
}

class DialogFieldAsset extends AbstractDialogField {

  private heat = <HeatService> heat.$inject.get('heat');
  private $q = <angular.IQService> heat.$inject.get('$q');
  private settings = <SettingsService> heat.$inject.get('settings');
  private user = <UserService> heat.$inject.get('user');
  private assetInfo = <AssetInfoService> heat.$inject.get('assetInfo');
  private availableAssets: Array<DialogFieldAssetAssetInfo> = [];

  constructor($scope, name: string, _default?: any) {
    super($scope, name, _default || '');
    this.selector('field-asset');
    this.heat.api.getAccountBalances(this.user.account, "0", 1, 0, 100).then((balances) => {
      this.availableAssets = [];
      balances.forEach((balance) => {
        if (balance.id != "0") {
          var info = this.assetInfo.parseProperties(balance.properties, {
            name: balance.id,
            symbol: balance.id
          });
          this.availableAssets.push({
            name: info.name,
            symbol: info.symbol,
            id: balance.id,
            decimals: balance.decimals
          });
        }
      })
    })
  }

  search(query: string) {
    var matches = [];
    var query = query.toLowerCase();
    this.availableAssets.forEach((asset) => {
      if ((asset.name && asset.name.toLowerCase().indexOf(query) != -1) ||
          (asset.symbol && asset.symbol.toLowerCase().indexOf(query) != -1) ||
          (asset.id && asset.id.toLowerCase().indexOf(query) != -1)) {
        matches.push(asset);
      }
    });
    var deferred = this.$q.defer();
    deferred.resolve(matches);
    return deferred.promise;
  }

  getAssetInfo(asset: string) : DialogFieldAssetAssetInfo {
    for (var i=0; i<this.availableAssets.length; i++) {
      if (this.availableAssets[i].id == asset) {
        return this.availableAssets[i];
      }
    }
    return null;
  }
}

@Component({
  selector: 'fieldAsset',
  inputs: ['label','value','changed','f'],
  styles: [`
  field-asset md-input-container {
    padding-bottom: 0px !important;
  }
  `],
  template: `
    <ng-form name="userForm">
      <md-autocomplete
        ng-required="vm.f._required"
        ng-readonly="vm.f._readonly"
        md-input-name="userField"
        md-floating-label="{{vm.label}}"
        md-min-length="1"
        md-items="item in vm.f.search(vm.searchText)"
        md-item-text="item.symbol + '    (' + item.id + ')'"
        md-search-text="vm.searchText"
        md-selected-item-change="vm.selectedItemChange()"
        md-search-text-change="vm.searchTextChange()"
        md-selected-item="vm.selectedItem">
        <md-item-template>
          <div layout="row" flex>
            <span>{{item.symbol}}</span>
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
class DialogFieldAssetComponent {
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