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
          <!-- TX ID  -->
          <div class="he truncate-col height-col left">Transaction ID</div>

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- BLOCKHEIGHT -->
          <div class="truncate-col id-col left">BLOCKHEIGHT</div>

          <!-- FROM -->
          <div class="truncate-col inoutgoing-col left">FROM</div>

          <!-- TO -->
          <div class="truncate-col transaction-col left">TO</div>

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- TX ID -->
            <div class="he truncate-col height-col left" >
              <span>
                <a target="_blank" href="https://blockexplorer.com/tx/{{item.txid}}">{{item.txid}}</a>
              </span>
            </div>

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.time}}</div>

            <!-- BLOCKHEIGHT -->
            <div class="truncate-col date-col left">{{item.blockheight}}</div>


            <!-- FROM -->
            <div class="truncate-col inoutgoing-col left">
             <span>testFrom {{item.from}}</span>
            </div>

            <!-- TO -->
            <div class="truncate-col transaction-col left">
              <span>testTo {{item.to}}</span>
            </div>

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">
              <span>some amount {{item.amount}}</span>
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

      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10*1000)

    let listener = this.determineLength.bind(this)
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: '+item.txid);
  }


  onSelect(selectedTransaction) {}
}

interface IBTCTransaction {

}