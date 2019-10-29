@Service('web3')
@Inject('$q', 'user', 'settings', '$window')
class Web3Service {

  public web3: any;
  private safeBuffer;
  private ethereumTx
  constructor(
              private $q: angular.IQService,
              private userService: UserService,
              private settingsService: SettingsService,
              private $window: angular.IWindowService) {

    const Web3 = $window.heatlibs.Web3
    this.safeBuffer = $window.heatlibs.safeBuffer
    this.ethereumTx = $window.heatlibs.ethereumTx
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

  sendEther(account: any,_to: string, _value: any): Promise<{ txHash:string }> {
    return new Promise((resolve, reject) => {
      this.web3.eth.sendRawTransaction(this.createRawTx2(_to, _value, account), (err, res) => {
        if(err) reject(err)
        resolve(res)
      });
    })
  }

  createRawTx = (to, value, account) => {
		var rawTx = {
      to,
			gasLimit: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)),
			gasPrice: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_PRICE)),
			value,
			nonce: 0 // this.web3.toHex(this.web3.eth.getTransactionCount(account.address))
    }
    let Transaction = this.ethereumTx.Transaction;
    var tx = new Transaction(rawTx);
    let Buffer = this.safeBuffer.Buffer;
    let bufferedKey = new Buffer(account.privateKey, 'hex')
		tx.sign(bufferedKey)
		var serializedTx = '0x' + tx.serialize().toString('hex')

		return serializedTx;
	}

  createRawTx2 = (to, value, account) => {
    let txParams = {
      nonce:    '0x00',
      gasLimit: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)),
      gasPrice: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_PRICE)),
      to:       to,
      value:    value.toString('hex')
    }
    // @ts-ignore
    let tx = new ethereumjs.Tx(txParams)
    // @ts-ignore
    tx.sign(new ethereumjs.Buffer.Buffer(account.privateKey, 'hex'))
    return '0x' + tx.serialize().toString('hex')
  }

}
