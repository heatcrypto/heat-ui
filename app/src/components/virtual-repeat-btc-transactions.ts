///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatBtcTransactions',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">
          <!-- HEIGHT
          <div class="he truncate-col height-col left" >Height</div>
          -->

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- ID -->
          <div class="truncate-col id-col left">Id</div>

          <!-- INOUT -->
          <div class="truncate-col inoutgoing-col left">In/Out</div>

          <!-- TRANSACTION -->
          <!-- <div class="truncate-col transaction-col left">Transaction</div> -->

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>

          <!-- TOFROM -->
          <div class="truncate-col tofrom-col left">To/From</div>

          <!-- INFO -->
          <div class="truncate-col info-col left" flex>Info</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- HEIGHT
            <div class="he truncate-col height-col left" >
              <span ng-show="item.height!=2147483647">{{item.heightDisplay}}</span>
              <span>
                <a target="_blank" href="https://etherscan.io/block/{{item.heightDisplay}}">{{item.heightDisplay}}</a>
              </span>
            </div>
            -->

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- ID -->
            <div class="truncate-col id-col left">
              <a target="_blank" href="https://ethplorer.io/tx/{{item.hash}}">{{item.hash}}</a>
            </div>

            <!-- INOUT -->
            <div class="truncate-col inoutgoing-col left">
              <md-icon md-font-library="material-icons" ng-class="{outgoing: item.outgoing, incoming: !item.outgoing}">
                {{item.outgoing ? 'keyboard_arrow_up': 'keyboard_arrow_down'}}
              </md-icon>
            </div>

            <!-- TRANSACTION -->
            <!-- <div class="truncate-col transaction-col left">
              <span ng-bind-html="item.renderedTransactionType"></span>
            </div> -->

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">
              <span ng-bind-html="item.renderedAmount"></span>
            </div>

            <!-- TOFROM -->
            <div class="truncate-col tofrom-col left">
              <span ng-bind-html="item.renderedToFrom"></span>
            </div>

            <!-- INFO -->
            <div class="truncate-col info-col left" flex>
              <span ng-bind-html="item.renderedInfo"></span>
            </div>

            <!-- JSON -->
            <div class="truncate-col json-col">
              <a ng-click="vm.jsonDetails($event, item)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>

          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope','$q','btcTransactionsProviderFactory','settings')
class VirtualRepeatBtcTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private btcTransactionsProviderFactory: BtcTransactionsProviderFactory,
              private settings: SettingsService) {
    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.btcTransactionsProviderFactory.createProvider(this.account),
      /* decorator function */
      (transaction: any|IBTCTransaction) => {
        var date = new Date(0); // 0 sets date to epoch time
        date.setUTCSeconds(<any>transaction.timestamp);
        transaction['time'] = dateFormat(date, format);
        transaction['heightDisplay'] = 'no height'
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10*1000)

    let listener = this.determineLength.bind(this)
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: '+item.transaction);
  }


  onSelect(selectedTransaction) {}
}

interface IBTCTransaction {

}