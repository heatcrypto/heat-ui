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
@RouteConfig('/explorer-block/:block')
@Component({
  selector: 'explorerBlock',
  inputs: ['block'],
  styles: [`
    explorer-block h3 {
      font-size: 24px !important;
      font-weight: bold;
      padding-bottom: 0px;
      margin-bottom: 0px;
    }
    explorer-block a {
      cursor: pointer;
    }
    explorer-block a i {
      font-size: 14px !important;
    }
  `],
  template: `
    <div layout="column" flex layout-fill layout-padding >
      <explorer-search layout="column" type="''" query="''"></explorer-search>
      <div layout="row" class="explorer-detail">
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              Height:
            </div>
            <div class="value">
              {{vm.height}}
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Time:
            </div>
            <div class="value">
              {{vm.time}}
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Block id:
            </div>
            <div class="value">
              <a href="#/explorer-block/{{vm.block}}">{{vm.block}}</a>
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              Generator:
            </div>
            <div class="value">
              <a href="#/explorer-account/{{vm.generator}}">{{vm.generatorPublicName||vm.generator}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Total amount:
            </div>
            <div class="value">
              {{vm.totalAmount}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Total fee:
            </div>
            <div class="value">
              {{vm.totalFee}} HEAT
            </div>
          </div>
        </div>
        <div layout="column" flex>
          <div class="col-item">
            <div class="title">
              POP reward:
            </div>
            <div class="value">
              {{vm.popReward}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              POS reward:
            </div>
            <div class="value">
              {{vm.posReward}} HEAT
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              JSON:
            </div>
            <div class="value">
              <a ng-click="vm.jsonDetails($event, vm.blockObject)">Show <i class="material-icons">code</i></a>
            </div>
          </div>
        </div>
      </div>
      <virtual-repeat-transactions layout="column" flex layout-fill block="vm.block"></virtual-repeat-transactions>
    </div>
  `
})
@Inject('$scope','heat','settings')
class ExplorerBlockComponent {
  block: string;//@input

  generator: string;
  generatorPublicName: string;
  totalAmount: string;
  totalFee: string;
  popReward: string;
  posReward: string;
  time: string;
  height: number;

  blockObject: any;

  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private settings: SettingsService) {
    let format = settings.get(SettingsService.DATEFORMAT_DEFAULT);
    heat.api.getBlock(this.block).then(block=>{
      $scope.$evalAsync(()=>{
        this.generator = block.generator;
        this.generatorPublicName = block['generatorPublicName'];
        this.totalAmount = utils.formatQNT(block.totalAmountHQT, 8);
        this.totalFee = utils.formatQNT(block.totalFeeHQT, 8);
        this.popReward = utils.formatQNT(block.popRewardHQT, 8);
        this.posReward = utils.formatQNT(block.posRewardHQT, 8);
        var date = utils.timestampToDate(block.timestamp);
        this.time = dateFormat(date, format);
        this.height = block.height;
        this.blockObject = block;
      })
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Block: '+item.block);
  }
}