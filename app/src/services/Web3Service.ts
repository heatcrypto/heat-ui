declare var Tx: any;
@Service('web3')
@Inject('$q', 'user', 'settings')
class Web3Service {

  public web3: any;
  constructor(
              private $q: angular.IQService,
              private userService: UserService,
              private settingsService: SettingsService) {

    var Web3 = require('web3');
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.settingsService.get(SettingsService.WEB3PROVIDER)));
  }

  getBalanceOf(address: any) : string {
    return this.web3.fromWei(this.web3.eth.getBalance(address));
  }

  getTransactionCount = (from: string) => {
    return new Promise((resolve, reject) => {
      this.web3.eth.getTransactionCount(from, (error, result) => {
        if (error) reject(error);
        resolve(this.web3.toHex(result));
      })
    })
  }

  getGasEstimate = (_from: string, _to: string, _data: string) => {
    return new Promise((resolve, reject) => {
      this.web3.eth.estimateGas({ from: _from, data: _data, to: _to }, (error, result) => {
        if (error) reject(error)
        resolve(this.web3.toHex(result));
      })
    })
  }

  getGasPrice = () => {
    return new Promise((resolve, reject) => {
      this.web3.eth.getGasPrice((error, result) => {
        if (error) reject(error);
        resolve(result.toString());
      })
    })
  }

  sendEther(_from: string,_to: string, _value: any) {
    this.web3.eth.sendTransaction({ from: _from, to: _to, value: _value, gasPrice: LightwalletService.GAS_PRICE, gas: LightwalletService.GAS }, function (err, txhash) {
      if (err) {
        dialogs.etherTransactionReceipt('Error', err.message);
      } else {
        dialogs.etherTransactionReceipt('Success', txhash);
      }
    })
  }
}