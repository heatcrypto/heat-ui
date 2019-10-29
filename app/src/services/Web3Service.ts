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
  }

  parseInput(input: string) {
    return this.web3.toAscii(input)
  }

  getTransactionCount2 = (address: string) => {
    return new Promise<number>((resolve, reject) => {
      this.http.get(this.blockbookEndpoint + "/address/" + address).then(
        resp => resolve(resp["txs"]),
        reason => reject(reason)
      );
    })
  }
  sendEther(account: any, _to: string, _value: any): Promise<{ txHash: string }> {
    return new Promise((resolve, reject) => {
      this.createRawTx2(_to, _value, account).then(
        rawTx => {
          this.http.get(this.blockbookEndpoint + "/sendtx/" + rawTx).then(
            resp => resolve({txHash: resp}),
            reason => reject(reason)
          );
        }
      )
    })
  }

  createRawTx2 = (to, value, account) => {
    return this.getTransactionCount2(account.address).then(
      txCount => {
        let txParams = {
          nonce: '0x' + txCount.toString(16),
          gasLimit: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)),
          gasPrice: this.web3.toHex(this.settingsService.get(SettingsService.ETH_TX_GAS_PRICE)),
          to: to,
          value: '0x' + parseInt(value).toString(16)
        };
        // @ts-ignore
        let tx = new ethereumjs.Tx(txParams);
        // @ts-ignore
        tx.sign(new ethereumjs.Buffer.Buffer(account.privateKey, 'hex'));
        return '0x' + tx.serialize().toString('hex')
      },
      reason => console.error(reason)
    );
  }


}
