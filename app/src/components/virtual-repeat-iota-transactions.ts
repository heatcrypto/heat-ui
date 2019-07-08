///<reference path='VirtualRepeatComponent.ts'/>

@Component({
  selector: 'virtualRepeatIotaTransactions',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
      </div>
      <md-list flex layout-fill layout="column">
        <md-list-item class="header">

          <!-- DATE -->
          <div class="truncate-col date-col left">Time</div>

          <!-- BUNDLE ID  -->
          <div class="truncate-col bundle-col left">Bundle ID</div>

          <!-- FROM -->
          <div class="truncate-col bundle-col left">FROM</div>

          <!-- TO -->
          <div class="truncate-col bundle-col left">TO</div>

          <!-- AMOUNT -->
          <div class="truncate-col amount-col left">Amount</div>

          <!-- JSON -->
          <div class="truncate-col json-col"></div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">

            <!-- DATE -->
            <div class="truncate-col date-col left">{{item.dateTime}}</div>

            <!-- Bundle ID -->
            <div class="truncate-col bundle-col left" >
              <span>
                <a target="_blank" href="https://thetangle.org/bundle/{{item.bundleId}}">{{item.displayBundleAddress}}</a>
              </span>
            </div>

            <!-- FROM -->
            <div class="truncate-col bundle-col left">
             <span>{{item.displayFromAddress}}</span>
            </div>

            <!-- TO -->
            <div class="truncate-col bundle-col left">
              <span>{{item.displayToAddress}}</span>
            </div>

            <!-- AMOUNT -->
            <div class="truncate-col amount-col left">
              <span>{{item.amount}}</span>
            </div>

            <!-- JSON -->
            <div class="truncate-col json-col">
              <a ng-click="vm.jsonDetails($event, item.json)">
                <md-icon md-font-library="material-icons">code</md-icon>
              </a>
            </div>

          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
    </div>
  `
})

@Inject('$scope', '$q', 'iotaTransactionsProviderFactory', 'settings', 'iotaPendingTransactions', 'user', 'iotaBlockExplorerService')
class VirtualRepeatIotaTransactionsComponent extends VirtualRepeatComponent {

  account: string; // @input

  constructor(protected $scope: angular.IScope,
    protected $q: angular.IQService,
    private iotaTransactionsProviderFactory: IotaTransactionsProviderFactory,
    private settings: SettingsService,
    private iotaPendingTransactions: IotaPendingTransactionsService,
    private user: UserService,
    private iotaBlockExplorerService: IotaBlockExplorerService) {

    super($scope, $q);
    var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
    this.initializeVirtualRepeat(
      this.iotaTransactionsProviderFactory.createProvider(this.user.currency.secretPhrase),
      /* decorator function */
      (bundle: any) => {
        bundle.dateTime = dateFormat(new Date(bundle[0].timestamp * 1000), this.settings.get(SettingsService.DATEFORMAT_DEFAULT));
        bundle.bundleId = bundle[0].hash;

        bundle.forEach(tx => {
          if(!bundle.from && tx.value < 0)
            bundle.from = tx.address;
          else if(bundle.from && tx.value < 0 && bundle.from !== tx.address)
            bundle.from = 'Multiple Inputs';

          if(!bundle.to && tx.value > 0){
            bundle.to = tx.address;
            bundle.amount = tx.value;
          }
        });

        bundle.displayFromAddress = bundle.from.substring(0, 42).concat('...')
        bundle.displayToAddress = bundle.to.substring(0, 42).concat('...')
        bundle.displayBundleAddress = bundle.bundleId.substring(0, 42).concat('...')


        bundle.json = {
          bundle: bundle.bundleId,
          time: bundle.dateTime,
          from: bundle.from,
          to: bundle.to,
          amount: bundle.amount,
        }
      }
    );

    var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
    let timeout = setTimeout(refresh, 10 * 1000)

    let listener = this.determineLength.bind(this)
    iotaPendingTransactions.addListener(listener)

    $scope.$on('$destroy', () => {
      iotaPendingTransactions.removeListener(listener)
      clearTimeout(timeout)
    })
  }

  jsonDetails($event, item) {
    dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
  }


  onSelect(selectedTransaction) { }
}