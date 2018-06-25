@RouteConfig('/bitcoin-account/:account')
@Component({
  selector: 'bitcoinAccount',
  inputs: ['account'],
  template: `
    <div layout="column" flex layout-fill>
      <div layout="row" class="explorer-detail">
        <div layout="column">
          <div class="col-item">
            <div class="title">
              Address:
            </div>
            <div class="value">
              <a href="#/bitcoin-account/{{vm.account}}">{{vm.account}}</a>
            </div>
          </div>
          <div class="col-item">
            <div class="title">
              Balance:
            </div>
            <div class="value">
              {{vm.balanceUnconfirmed}} BTC
            </div>
          </div>
        </div>
      </div>

      <div flex layout="column">
        <virtual-repeat-btc-transactions layout="column" flex layout-fill account="vm.account"></virtual-repeat-btc-transactions>
      </div>
    </div>
  `
})
@Inject('$scope', 'btcBlockExplorerService')
class BitcoinAccountComponent {
  account: string; // @input
  balanceUnconfirmed: any;

  constructor(private $scope: angular.IScope,
              private btcBlockExplorerService: BtcBlockExplorerService) {

    this.btcBlockExplorerService.getBalance(this.account).then((response) => {
      this.balanceUnconfirmed = parseFloat(response) / 100000000; // convert response from Satoshis to BTC
    });
  }
}
