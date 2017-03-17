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
  selector: 'traderInfoAssetDescription',
  inputs: ['currencyInfo','assetInfo'],
  styles: [`
  trader-info-asset-description {
    padding-bottom: 0px !important;
    padding-right: 0px !important;
  }
  trader-info-asset-description .description {
    overflow: auto;
    margin-bottom: 0px !important;
    margin-top: 0px !important;
  }
  trader-info-asset-description > div > div:first-child {
    margin-right: 16px !important;
  }
  trader-info-asset-description .seperator {
    padding-bottom: 8px;
  }
  trader-info-asset-description table {
    width: 100%;
  }
  trader-info-asset-description table td .stretched {
    width: 100%;
  }
  trader-info-asset-description table td md-icon {
    font-weight: bold;
    color: red;
  }
  trader-info-asset-description table td md-icon.iscertified {
    color: green !important;
  }
  `],
  template: `
    <div layout="row" flex layout-fill>
      <table>
        <tr>
          <td ng-class="{certified:vm.currencyInfo.certified}">{{vm.currencyInfo.symbol}}</td>
          <td class="stretch" ng-class="{certified:vm.currencyInfo.certified}"><i>{{vm.currencyInfo.name}}</i></td>
          <td ng-class="{certified:vm.currencyInfo.certified}">{{vm.assetInfo.symbol}}</td>
          <td class="stretch" ng-class="{certified:vm.currencyInfo.certified}"><i>{{vm.assetInfo.name}}</i></td>
        </tr>
        <tr>
          <td>Issuer</td>
          <td class="stretch">{{vm.currencyIssuer}}</td>
          <td>Issuer</td>
          <td class="stretch">{{vm.assetIssuer}}</td>
        </tr>
        <tr>
          <td>Certified</td>
          <td class="stretch">
            <md-icon ng-class="{iscertified:vm.currencyInfo.certified}" md-font-library="material-icons">{{vm.currencyInfo.certified?'check':'not_interested'}}</md-icon>
          </td>
          <td>Certified</td>
          <td class="stretch">
            <md-icon ng-class="{iscertified:vm.assetInfo.certified}" md-font-library="material-icons">{{vm.assetInfo.certified?'check':'not_interested'}}</md-icon>
          </td>
        </tr>
        <tr>
          <td>Launched</td>
          <td class="stretch">{{vm.currencyLaunched}}</td>
          <td>Launched</td>
          <td class="stretch">{{vm.assetLaunched}}</td>
        </tr>
        <tr>
          <td colspan="2"><button ng-click="vm.showDescription($event, vm.currencyInfo)">More info</button></td>
          <td colspan="2"><button ng-click="vm.showDescription($event, vm.assetInfo)">More info</button></td>
        </tr>
      </table>
    </div>
  `
})
@Inject('$scope','settings','assetInfo','$q','heat')
class TraderInfoAssetDescriptionComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  isBtcAsset=false;
  currencyIssuer: string;
  assetIssuer: string;
  currencyLaunched: string;
  assetLaunched: string;

  constructor(private $scope: angular.IScope,
              private settings: SettingsService,
              private assetInfoService: AssetInfoService,
              private $q: angular.IQService,
              private heat: HeatService) {
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.isBtcAsset = this.currencyInfo.id==this.settings.get(SettingsService.HEATLEDGER_BTC_ASSET);
        this.loadCurrencyInfo(this.currencyInfo.id);
        this.loadAssetInfo(this.assetInfo.id);
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  loadCurrencyInfo(id: string) {
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    if (id=="0") {
      this.$scope.$evalAsync(()=> {
        this.currencyIssuer = "Heat Ledger Ltd.";
        this.currencyLaunched = dateFormat(utils.timestampToDate(100149557), format);
      });
    }
    else {
      this.heat.api.getAsset(id, "0", 1).then((asset)=> {
        this.$scope.$evalAsync(()=> {
          this.currencyIssuer = asset.account == "9583431768758058558" ? "Heat Ledger Ltd." : asset.account;
          this.currencyLaunched = "";//dateFormat(utils.timestampToDate(asset.timestamp), format);
        });
      })
    }
  }

  loadAssetInfo(id: string) {
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    if (id=="0") {
      this.$scope.$evalAsync(()=> {
        this.assetIssuer = "Heat Ledger Ltd.";
        this.assetLaunched = dateFormat(utils.timestampToDate(100149557), format);
      });
    }
    else {
      this.heat.api.getAsset(id, "0", 1).then((asset)=> {
        this.$scope.$evalAsync(()=> {
          this.assetIssuer = asset.account == "9583431768758058558" ? "Heat Ledger Ltd." : asset.account;
          this.assetLaunched = "";//dateFormat(utils.timestampToDate(asset.timestamp), format);
        });
      })
    }
  }

  showDescription($event, info: AssetInfo) {
    dialogs.assetInfo($event, info);
  }
}