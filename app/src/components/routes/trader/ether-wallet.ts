/// <reference path='../../../services/transactions/lib/GenericDialog.ts'/>

@RouteConfig('/ethwallet')
@Component({
  selector: 'etherwallet',
  styles: [`
    .details-block {
      height: 200px;
      margin-left: 50px;
      margin-top: 20px;
    }
    .actions-block {
      padding-top: 25px;
    }
  `],
  template: `
    <div class="details-block">
      <div>
        Ether Account Address: "{{vm.wallet.walletAddress}}" </br>
        Ether Balance: {{vm.etherBalance}} Eth </br>
      </div>
      <div class="actions-block">
        <md-button class="md-primary" ng-click="vm.showDeposit($event)">Deposit Ether</md-button>
        <md-button class="md-warn" ng-click="vm.withdrawEther()">Withdraw Ether</md-button>
      </div>
      <div class="actions-block">
        <md-button class="md-primary" ng-click="vm.backupWallet()">Backup Wallet</md-button>
      </div>
    </div>

    <ether-transactions layout="column" flex address="vm.wallet.walletAddress" balance="vm.etherBalance"></<ether-transactions>
  `

})
@Inject('web3', 'user')
class EtherWallet {

  constructor(
              private web3Service: Web3Service,
              private userService: UserService) {
    this.getEtherAccountBalance();
    this.subscribeToGetEtherBalanceInterval();
  }

  private wallet = <LightwalletService>heat.$inject.get('lightwalletService');
  private etherBalance: string;
  private userEtherereumAddress: string;
  private transactions = [];

  subscribeToGetEtherBalanceInterval() {
    var that = this;
    setInterval(function () {
      that.etherBalance = that.web3Service.getBalanceOf(that.wallet.walletAddress);
    }, 10000);
  }

  showDeposit($event) {
    dialogs.showEtherDepositDialog($event, this.wallet.walletAddress);
  };

  getEtherAccountBalance() {
    this.etherBalance = this.web3Service.getBalanceOf(this.wallet.walletAddress);
  }

  withdrawEther($event) {
    dialogs.withdrawEther($event);
  }

  backupWallet() {
    var encoded = JSON.stringify(this.getFileContents(), null, 2);
    var blob = new Blob([encoded], { type: "text/plain;charset=utf-8" });
    saveAs(blob, 'my-eth-wallet.txt');
  }

  private getFileContents() {
    let walletFile: IEtherWalletFileContents = {
      walletAddress: this.wallet.walletAddress,
      seedPhrase: this.wallet.secretSeed,
      privateKey: this.wallet.privateKey
    };
    return walletFile;
  }
}

interface IEtherWalletFileContents {
  walletAddress: string;
  privateKey: string;
  seedPhrase: string;
}
