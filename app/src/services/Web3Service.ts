declare var Tx: any;
@Service('web3')
@Inject('$q', 'user', 'settings')
class Web3Service {

  public web3: any;
  constructor(
              private $q: angular.IQService,
              private userService: UserService,
              private settingsService: SettingsService) {

    var Web3 = window['Web3']
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.settingsService.get(SettingsService.WEB3PROVIDER)));
  }

  parseInput(input: string) {
    return this.web3.toAscii(input)
  }

  getBalanceOf(address: any) : angular.IPromise<string> {
    let deferred = this.$q.defer<string>()
    this.web3.eth.getBalance(address, (err,balance) => {
      if (err) deferred.reject(err)
      else deferred.resolve(this.web3.fromWei(balance))
    })
    return deferred.promise
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

  sendEther(_from: string,_to: string, _value: any): Promise<{ txHash:string }> {
    let data = {
      from: _from,
      to: _to,
      value: _value,
      gasPrice: this.settingsService.get(SettingsService.ETH_TX_GAS_PRICE),
      gas: this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)
    }
    return new Promise((resolve, reject) => {
      this.web3.eth.sendTransaction(data, (err, txHash) => {
        if (err) {
          reject(err)
        }
        else {
          resolve({
            txHash: txHash
          })
        }
      })
    })
  }
}