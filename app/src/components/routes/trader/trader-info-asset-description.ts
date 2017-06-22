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
  template: `
    <div class="asset-container">
      <div class="asset-description">
        <div class="col">
          <div class="col-item">
            <div class="title">
              Asset name:
            </div>
            <div class="value">
              <a ng-click="vm.showDescription($event, vm.currencyInfo)">{{vm.currencyInfo.name}}</a>
            </div>
          </div>
          <div class="col-item issued-by">
            <div class="title">
              Issuer:
            </div>
            <div class="value">
              <a href="#/explorer-account/{{vm.currencyIssuer}}">{{vm.currencyIssuerPublicName||vm.currencyIssuer}}</a>
            </div>
          </div>
          <div class="col-item launched">
            <div class="title">
              Certified:
            </div>
            <div class="value">
              <md-icon ng-class="{iscertified:vm.currencyInfo.certified}" md-font-library="material-icons">{{vm.currencyInfo.certified?'check':'not_interested'}}</md-icon>
              <span ng-if="vm.currencyInfo.certified == true">Yes</span>
              <span ng-if="vm.currencyInfo.certified == false">No</span>
            </div>
          </div>
          <div class="col-item id">
            <div class="title">
              Launched:
            </div>
            <div class="value">
              {{vm.currencyLaunched}}
            </div>
          </div>
          <div class="col-item" ng-if="vm.currencyInfo.id != '0' && vm.currencyInfo.certified && vm.user.unlocked">
            <md-button class="md-primary" ng-click="vm.showDeposit($event, vm.currencyInfo)">Deposit {{vm.currencyInfo.symbol}}</md-button>
            <md-button class="md-warn" ng-click="vm.showWithdraw($event, vm.currencyInfo)">Withdraw {{vm.currencyInfo.symbol}}</md-button>
          </div>
        </div>
      </div>
      <div class="asset-description">
        <div class="col">
          <div class="col-item header">
            <div class="title">
              Asset name:
            </div>
            <div class="value">
              <a ng-click="vm.showDescription($event, vm.assetInfo)">{{vm.assetInfo.name}}</a>
            </div>
          </div>
          <div class="col-item issued-by">
            <div class="title">
              Issuer:
            </div>
            <div class="value">
              <a href="#/explorer-account/{{vm.assetIssuer}}">{{vm.assetIssuerPublicName||vm.assetIssuer}}</a>
            </div>
          </div>
          <div class="col-item launched">
            <div class="title">
              Certified:
            </div>
            <div class="value">
              <md-icon ng-class="{iscertified:vm.assetInfo.certified}" md-font-library="material-icons">{{vm.assetInfo.certified?'check':'not_interested'}}</md-icon>
              <span ng-if="vm.assetInfo.certified===true">Yes</span>
              <span ng-if="vm.assetInfo.certified===false">No</span>
            </div>
          </div>
          <div class="col-item id">
            <div class="title">
              Launched:
            </div>
            <div class="value">
              {{vm.assetLaunched}}
            </div>
          </div>
          <div class="col-item" ng-if="vm.assetInfo.id != '0' && vm.assetInfo.certified && vm.user.unlocked">
            <md-button class="md-primary" ng-click="vm.showDeposit($event, vm.assetInfo)">Deposit {{vm.assetInfo.symbol}}</md-button>
            <md-button class="md-warn" ng-click="vm.showWithdraw($event, vm.assetInfo)">Withdraw {{vm.assetInfo.symbol}}</md-button>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','settings','assetInfo','$q','heat','user','assetWithdraw')
class TraderInfoAssetDescriptionComponent {

  // inputs
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  currencyIssuer: string;
  currencyIssuerPublicName: string;
  assetIssuer: string;
  assetIssuerPublicName: string;
  currencyLaunched: string;
  assetLaunched: string;

  constructor(private $scope: angular.IScope,
              private settings: SettingsService,
              private assetInfoService: AssetInfoService,
              private $q: angular.IQService,
              private heat: HeatService,
              public user: UserService,
              private assetWithdraw: AssetWithdrawService) {
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.$scope.$evalAsync(()=> {
          this.currencyIssuer = this.currencyInfo.issuer;
          this.currencyIssuerPublicName = this.currencyInfo.issuerPublicName;
          this.currencyLaunched = dateFormat(utils.timestampToDate(this.currencyInfo.timestamp), format);
          this.assetIssuer = this.assetInfo.issuer;
          this.assetIssuerPublicName = this.assetInfo.issuerPublicName;
          this.assetLaunched = dateFormat(utils.timestampToDate(this.assetInfo.timestamp), format);
        });
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  showDescription($event, info: AssetInfo) {
    dialogs.assetInfo($event, info);
  }

  showDeposit($event, info: AssetInfo) {
    dialogs.depositAsset($event, info.id);
  }

  showWithdraw($event, info: AssetInfo) {
    if (this.currencyInfo.id != '0') {
      this.assetWithdraw.dialog($event, info).then((dialog)=> {
        dialog.show();
      });
    }
  }
}
