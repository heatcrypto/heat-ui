@Component({
  selector: 'walletSearch',
  inputs: ['walletComponent', 'query', 'queryTokens'],
  styles: [`
    .active {
      font-size: 20px;
      font-weight: bold;
      color: deepskyblue;
    }
  `],
  template: `
    <span layout="row" flex layout-fill>
      <md-input-container flex style="height: 34px; margin-top: 8px; margin-bottom: 2px;">
        <label>Search for currency, address, account</label>
        <input name="search-text" ng-model="vm.query" ng-keypress="vm.onKeyPress($event)"/>
      </md-input-container>
      <div class="md-button" style="align-content: center; border: solid 1px deepskyblue; border-radius: 24px; color: grey !important; font-size: 12px; height: 30px;"
            ng-click="vm.switchOperator()">
        <code ng-class="{active: vm.logicalOperator == 'or'}">or</code> / <code ng-class="{active: vm.logicalOperator == 'and'}">and</code>
      </div>
      <div ng-if="vm.queryTokens" class="value"  style="margin: 7px; max-width: 200px;">
        <span ng-repeat="s in vm.queryTokens track by $index">
          <code ng-if="$index > 0" style="color: deepskyblue"> {{vm.logicalOperator}}</code>
          <span>{{s}}</span>
        </span>
      </div>
<!--      <span style="margin: 7px; max-width: 200px; color: #7e88d2">{{vm.expression}}</span>-->
      <button style="height: 28px;" ng-click="vm.applyFilter()">search</button>
    </span>
  `
})
@Inject('$scope','$location')
class WalletSearchComponent {
  walletComponent: wlt.WalletComponentAbstract // @input
  query: string // @input
  queryTokens: string[] // @input
  logicalOperator: 'and' | 'or' = "or"
  expression: string[]

  constructor(private $scope: angular.IScope, private $location: angular.ILocationService) {}

  onKeyPress($event) {
    if ($event.keyCode == 13) {
      this.applyFilter()
      //this.expression = this.queryTokens?.join(' <code>' + this.logicalOperator + '</code> ')
      // this.expression = []
      // if (this.queryTokens?.length > 0) {
      //   this.expression = [this.queryTokens[0]]
      //   for (let i = 1; i < this.queryTokens.length; i++) {
      //     this.expression.push(this.logicalOperator, this.queryTokens[i])
      //   }
      // }
    }
  }

  switchOperator() {
    this.logicalOperator = this.logicalOperator == "or" ? "and" : "or"
    this.applyFilter()
  }

  applyFilter() {
    this.queryTokens = this.walletComponent.applyFilter(this.query, this.logicalOperator)
  }

}