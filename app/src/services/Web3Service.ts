@Service('web3')
@Inject('$q', 'user', 'settings', '$window', 'http')
class Web3Service {

  public web3: any;
  public blockbookEndpoint: string;
  private safeBuffer;
  private ethereumTx;

  constructor(
    private $q: angular.IQService,
    private userService: UserService,
    private settingsService: SettingsService,
    private $window: angular.IWindowService,
    private http: HttpService) {

    const Web3 = $window.heatlibs.Web3
    this.safeBuffer = $window.heatlibs.safeBuffer
    this.ethereumTx = $window.heatlibs.ethereumTx
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.settingsService.get(SettingsService.WEB3PROVIDER)));

    this.settingsService.initialized.then(
      () => this.blockbookEndpoint = SettingsService.getCryptoServerEndpoint('ETH')
    );
  }

  parseInput(input: string) {
    return this.web3.toAscii(input)
  }

  getTransactionCount2 = (address: string) => {
    return new Promise<number>((resolve, reject) => {
      this.http.get(this.blockbookEndpoint + "/address/" + address).then(
        resp => resolve((angular.isString(resp) ? JSON.parse(resp) : resp).nonce),
        reason => reject(reason)
      );
    })
  }
  sendEther(account: any, _to: string, _value: any): Promise<{ txHash: string }> {
    return new Promise((resolve, reject) => {
      this.createRawTx2(account, _to, _value).then(
        rawTx => {
          this.http.get(this.blockbookEndpoint + "/sendtx/" + rawTx).then(
            resp => {
              resolve({ txHash: resp })
            },
            reason => {
              reject(reason)
            }
          );
        }
      )
    })
  }

  getGasPrice = () => {
    return new Promise<number>((resolve) => {
      this.http.get(this.blockbookEndpoint + "/estimatefee/5").then(
        response => {
          if (!response) resolve(20000000000)
          let r = angular.isString(response) ? JSON.parse(response) : response
          resolve(this.web3.toWei(r.result, 'ether'))
        },
        reason => {
          resolve(20000000000)
        }
      );
    })
  }

  createRawTx2 = (account, to, value, gasPriceParam?, gasLimitParam?) => {
    return new Promise((resolve, reject) => {
      this.getGasPrice().then((gasPrice) => {
        this.getTransactionCount2(account.address).then(
          txCount => {
            let defaultGasLimit = this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)
            let txParams = {
              nonce: '0x' + Number(txCount).toString(16),
              gasLimit: this.web3.toHex(gasLimitParam || defaultGasLimit),
              gasPrice: this.web3.toHex(String(gasPriceParam || gasPrice)),
              to: to,
              value: '0x' + Number(value).toString(16)
            };
            let tx = new this.$window.heatlibs.ethereumTx.Transaction(txParams);
            let privateKey = this.$window.heatlibs.safeBuffer.Buffer.from(account.privateKey, 'hex');
            tx.sign(privateKey);
            resolve('0x' + tx.serialize().toString('hex'))
          },
          reason => reject(reason)
        )
      })
    })
  }


}
