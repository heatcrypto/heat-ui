@Component({
  selector: 'walletSearch',
  inputs: ['walletComponent', 'query'],
  template: `
    <div layout="row" flex layout-fill>
      <md-input-container flex style="height: 34px; margin-top: 8px; margin-bottom: 2px;">
        <label>Search for currency, address, account</label>
        <input name="search-text" ng-model="vm.query" ng-keypress="vm.onKeyPress($event)">
      </md-input-container>
    </div>
  `
})
@Inject('$scope','$location')
class WalletSearchComponent {
  walletComponent: wlt.WalletComponentAbstract; // @input
  query: string; // @input

  constructor(private $scope: angular.IScope, private $location: angular.ILocationService) {}

  onKeyPress($event) {
    if ($event.keyCode == 13) {
      this.walletComponent.applyFilter(this.query)
    }
  }
}