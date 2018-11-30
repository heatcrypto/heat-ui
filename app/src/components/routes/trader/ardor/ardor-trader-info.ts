@Component({
  selector: 'ardorTraderInfo',
  inputs: ['currencyInfo','assetInfo','toggleMarkets','marketsSidenavOpen'],
  template: `
    <div>
      <div class="top-row">
        <div class="market-title">
          <span>
            <md-button class="md-icon-button show-hide" aria-label="Show/hide markets" ng-click="vm.toggleMarkets()">
              <md-tooltip md-direction="bottom">Show/Hide markets</md-tooltip>
              <i><img src="assets/{{vm.marketsSidenavOpen?'minusIcon':'plusIcon'}}.png"></i>
            </md-button>
          </span>
          <span class="market-title-text">
            <span ng-class="{certified:vm.currencyInfo.certified}">{{vm.currencyInfo.symbol}}</span>/<span ng-class="{certified:vm.assetInfo.certified}">{{vm.assetInfo.symbol}}</span>
          </span>
        </div>
      </div>
      <ardor-trader-info-asset-description currency-info="vm.currencyInfo" asset-info="vm.assetInfo"></ardor-trader-info-asset-description>
    </div>
  `
})
class ArdorTraderInfoComponent {
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input
  toggleMarkets: Function; // @input (controls the parent component markets sidenav)
  marketsSidenavOpen: boolean; // @input (bound to parent component markets sidenav md-is-open)
}
