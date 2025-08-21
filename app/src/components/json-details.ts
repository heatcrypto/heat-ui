@Component({
    selector: 'jsonDetails',
    inputs: ['data', 'fields', 'detailedObject', 'isJsonText', 'compact'],
    styles: [`
    .spacious {
        padding: 8px;
     }
     .value {
        opacity: 0.6;
     }
     .switcher-col {
       margin-left: -40px;
       margin-right: -20px;
     }
     .switcher {
        opacity: 40%;
        transform: rotate(-90deg);
        font-size: smaller !important;    
        width: 100px;
        height: 93px;
        min-width: 32px;
        padding: 0;
        margin: 0;
     }
     .on {
        opacity: 100%;
     }
  `],
    template: `
    <div layout="row" flex>
          <div ng-if="vm.fields || vm.json" layout="column" class="switcher-col">
            <md-button ng-if="vm.fields" ng-class="{'on': vm.viewNum == 0}" ng-click="vm.toggle(0)" class="switcher">
                Table view
            </md-button>
            <md-button ng-class="{'on': vm.viewNum == 1}" ng-click="vm.toggle(1)" class="switcher">
                Details
            </md-button>
            <md-button ng-if="vm.isJsonText" ng-class="{'on': vm.viewNum == 2}" ng-click="vm.toggle(2)" class="switcher">
                JSON text
            </md-button>
          </div>
          
          <div ng-if="vm.viewNum == 0">
            <table class="details">
                <tr ng-repeat="item in vm.fields track by $index" class="row">
                    <td ng-class="{'spacious':!vm.compact}">{{item[1] || item[0]}}</td><td class="value" ng-class="{'spacious':!vm.compact}" ng-bind-html="vm.detailedObject[item[0]]"></td>
                </tr>
            </table>
          </div>
          
          <div layout="column" flex ng-if="vm.viewNum == 1">
            <json-formatter json="vm.data" open="1" class="json-formatter-dark"></json-formatter>
          </div>
          
          <div layout="column" flex ng-if="vm.viewNum == 2">
            <textarea readonly style="height: 100%">{{vm.data | json}}</textarea>
          </div>
        </div>
  `
})
@Inject('$scope', '$location')
class JsonDetails {
    data: any // @input
    fields?: string[][] // @input
    private _detailedObject?: any // @input
    isJsonText?: boolean  // @input
    compact?: boolean  // @input
    viewNum = 0  // 0: table, 1: json tree, 2: json text

    constructor(private $scope: angular.IScope, private $location: angular.ILocationService) {}

    get detailedObject(): any {
        return this._detailedObject || this.data
    }

    set detailedObject(value: any) {
        this._detailedObject = value
    }

    toggle(num) {
        this.viewNum = num
    }

}