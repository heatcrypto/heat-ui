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
        <label>Search for wallet entry by currency, address, account</label>
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
      <a style="margin-left: 7px; width: 60px;" ng-if="vm.reasoning" ng-click="vm.showExplainedFinds()">Explain finds</a>
    </span>
  `
})
@Inject('$scope','$location', 'panel')
class WalletSearchComponent {
  walletComponent: wlt.WalletComponentAbstract // @input
  query: string // @input
  queryTokens: string[] // @input
  reasoning: any[]
  logicalOperator: 'and' | 'or' = "and"
  expression: string

  constructor(private $scope: angular.IScope, private $location: angular.ILocationService, private panel: PanelService) {}

  onKeyPress($event) {
    if ($event.keyCode == 13) {
      this.applyFilter()
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
    let filterResult = this.walletComponent.applyFilter(this.query, this.logicalOperator)
    this.queryTokens = filterResult?.queryTokens
    this.expression = this.queryTokens?.join(' ' + this.logicalOperator.toUpperCase() + ' ')
    this.reasoning = filterResult?.searchResultExplained.map(v => {
      let finds: Map<string, string[]> = v.finds
      let entryStr = Array.from(finds.entries()).map(e => `    ${e[0]} => ${e[1]}`).join('\n')
      return `${v.account}:\n${entryStr}`
    })
  }

  showExplainedFinds($event) {
    let f = (title, expression, content) => {
      dialogs.dialog({
        id: 'explainedFinds',
        title: title,
        //targetEvent: $event,
        okButton: false,
        cancelButton: false,
        locals: {
          close: function() {
            dialogs.$mdDialog().hide();
          },
          content: content,
          expression: expression
        },
        template: `
        <p>
          <label>Expression: </label><br><code>{{vm.expression}}</code>
        </p>
        <!--<md-input-container flex>-->
          <textarea readonly rows="20" ng-model="vm.content" id="content-textarea" style="font-family: monospace; width: 540px;"></textarea>
        <!--</md-input-container>-->
        <div layout="row" layout-align="center center" style="margin-top: 6px; min-height: 25px">
          <md-button class="md-primary" ng-click="vm.close()">Close</md-button>
        </div>
      `,
        style: `
        #content-textarea {
            width: 100%;
        }
      `
      })
    }

    f("Explained finds", this.expression, this.reasoning?.join('\n\n'))

    /*this.panel.show(`
      <div layout="column" flex style="padding: 10px; background-color: #4d5168; border-radius: 4px;">
        <md-input-container flex>                                                                                                                                                           
          <h3>Explained finds:</h3>
          <md-content readonly style="white-space: pre-wrap; font-family: monospace; overflow: auto; min-width: 400px; max-height: 400px;">{{vm.result}}</md-content>
        </md-input-container>
      </div>
    `, {
      result: this.reasoning?.join('\n')
    })*/
  }

}