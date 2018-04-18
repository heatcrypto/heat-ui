@Component({
  selector: 'etherTransactions',
  inputs: ['address', 'balance'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="trader-component-title">Past trades
      </div>

      <md-list flex layout-fill layout="column" make-scrollable >
        <md-list-item class="header">
          <!-- Block Number -->
          <div class="truncate-col block-number-col left">Block#</div>

          <!-- From -->
          <div class="truncate-col from-col left">From</div>

          <!-- To -->
          <div class="truncate-col to-col left">To</div>

          <!-- Value -->
          <div class="truncate-col value-col left">Value (in Wei)</div>

          <!-- Confirmations -->
          <div class="truncate-col amount-col left">Confirmations</div>

          <!-- Time -->
          <div class="truncate-col time-col left">Date & Time</div>

        </md-list-item>
        <md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
          <md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry">
            <!-- Block Number -->
            <div class="truncate-col block-number-col left">
              {{item.blockNumber}}
            </div>

            <!-- From -->
            <div class="truncate-col from-col left">
              {{item.from}}
            </div>

            <!-- To -->
            <div class="truncate-col to-col block left">
              {{item.to}}
            </div>

            <!-- Value -->
            <div class="truncate-col value-col left">
              {{item.value}}
            </div>

            <!-- Confirmations -->
            <div class="truncate-col amount-col left">
              {{item.confirmations}}
            </div>

            <!-- Time -->
            <div class="truncate-col time-col left">
              {{item.dateTime}}
            </div>

          </md-list-item>
        </md-virtual-repeat-container
      </md-list>
    </div>
  `
})
@Inject('$scope','$q', 'etherscanService', 'etherscanTransactionsProviderFactory', 'lightwalletService', '$interval')
class etherTransactions extends VirtualRepeatComponent {

  /* input*/
  address: string;
  balance: string;

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService,
              private etherscanService: EtherscanService,
              private etherscanTransactionsProviderFactory: EtherscanTransactionsProviderFactory,
              private lightwalletService: LightwalletService,
              private $interval: angular.IIntervalService) {

    super($scope, $q);

    this.getEtherTransactions();
    this.subscribeToEtherAddressChange();
  }

  static timeStampToDateTimeString(timeStamp) {
    var utcSeconds = timeStamp;
    var date = new Date(0); // 0 sets date to epoch time
    date.setUTCSeconds(utcSeconds);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  }

  subscribeToEtherAddressChange() {
    var account = this.address;
    var balance = this.balance;
    var interval = this.$interval(() => {
      if(account === this.address && balance.toString() === this.balance.toString()) {return;}
      account = this.address;
      balance = this.balance;
      this.getEtherTransactions();
    }, 5000, 0, false);
    this.$scope.$on('$destroy', () => { this.$interval.cancel(interval) });
  }

  getEtherTransactions() {
    this.initializeVirtualRepeat(
      this.etherscanTransactionsProviderFactory.createProvider(),
      /* decorator function */
      (tx: any|IEtherscanTransaction) => {
        tx.dateTime = etherTransactions.timeStampToDateTimeString(tx.timeStamp);
       }
    );
  }

  onSelect(selectedBlock) {}
}

interface IEtherscanTransaction {
  blockNumber: string;
  timeStamp: Long;
  hash: string;
  nonce: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: number;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: number;
  confirmations: string;
}