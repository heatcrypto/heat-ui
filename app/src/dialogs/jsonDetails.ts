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
module dialogs {
  /**
   *
   * @param $event
   * @param jsonObject
   * @param title
   * @param fields array of displayed field in TABLE VIEW mode, each field is array of [name, label]
   * @param detailedObject optional object used for detailed view instead of jsonObject
   * @param jsonText display json as text
   */
  export function jsonDetails($event, jsonObject: any, title: string, 
                              fields?: string[][], detailedObject?: any, jsonText?: boolean) {
    return dialogs.dialog({
      id: 'jsonDetails',
      title: title,
      targetEvent: $event,
      cancelButton: false,
      locals: {
        jsonObject: jsonObject,
        detailedObject: detailedObject || jsonObject,
        viewNum: fields?.length > 0 ? 0 : 1,  // 0: table, 1: json tree, 2: json text
        fields: fields,
        jsonText: jsonText,
        toggle: function(num) {
          this.viewNum = num
        }
      },
      style: `
         .details td {
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
        `,
      template: `
        <div layout="row" flex>
        
          <div ng-if="vm.fields || vm.json" layout="column" class="switcher-col">
            <md-button ng-if="vm.fields" ng-class="{'on': vm.viewNum == 0}" ng-click="vm.toggle(0)" class="switcher">
                Table view
            </md-button>
            <md-button ng-class="{'on': vm.viewNum == 1}" ng-click="vm.toggle(1)" class="switcher">
                JSON formatted
            </md-button>
            <md-button ng-if="vm.jsonText" ng-class="{'on': vm.viewNum == 2}" ng-click="vm.toggle(2)" class="switcher">
                JSON text
            </md-button>
          </div>
          
          <div ng-if="vm.viewNum == 0">
            <table class="details">
                <tr ng-repeat="item in vm.fields" class="row">
                    <td>{{item[1] || item[0]}}</td><td class="value" ng-bind-html="vm.detailedObject[item[0]]"></td>
                </tr>
            </table>
          </div>
          
          <div layout="column" flex ng-if="vm.viewNum == 1">
            <json-formatter json="vm.jsonObject" open="1" class="json-formatter-dark"></json-formatter>
          </div>
          
          <div layout="column" flex ng-if="vm.viewNum == 2">
            <textarea readonly style="height: 100%">{{vm.jsonObject | json}}</textarea>
          </div>
        </div>
      `
    });
  }
}
