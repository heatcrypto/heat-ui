@Component({
  selector: 'ardorTraderInfoAssetDescription',
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
              {{vm.currencyIssuerPublicName||vm.currencyIssuer}}
            </div>
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
              {{vm.assetIssuerPublicName||vm.assetIssuer}}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','assetInfo','$q','heat','user')
class ArdorTraderInfoAssetDescriptionComponent {

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
              private assetInfoService: AssetInfoService,
              private $q: angular.IQService,
              private heat: HeatService,
              public user: UserService) {
    var ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        this.$scope.$evalAsync(()=> {
          this.currencyIssuer = this.currencyInfo.issuer;
          this.currencyIssuerPublicName = this.currencyInfo.issuerPublicName;
          this.assetIssuer = this.assetInfo.issuer;
          this.assetIssuerPublicName = this.assetInfo.issuerPublicName;
        });
        unregister.forEach(fn => fn());
      }
    };
    var unregister = [$scope.$watch('vm.currencyInfo', ready),$scope.$watch('vm.assetInfo', ready)];
  }

  showDescription($event, info: AssetInfo) {
    dialogs.assetInfo($event, info);
  }
}
