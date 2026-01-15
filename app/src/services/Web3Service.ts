@Service('web3')
@Inject('$q', 'user', 'settings', '$window', 'http', 'storage')
class Web3Service {

  public static GWEI_SCALE = 1000000000

  public web3: any;
  public blockbookEndpoint: string;
  public mobileHeatwalletEndpoint: string;
  private safeBuffer;
  private ethereumTx;

  constructor(
    private $q: angular.IQService,
    private userService: UserService,
    private settingsService: SettingsService,
    private $window: angular.IWindowService,
    private http: HttpService,
    private storage: StorageService) {

    const Web3 = $window.heatlibs.Web3
    this.safeBuffer = $window.heatlibs.safeBuffer
    this.ethereumTx = $window.heatlibs.ethereumTx
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.settingsService.get(SettingsService.WEB3PROVIDER)));

    this.settingsService.initialized.then(
      () => {
          this.blockbookEndpoint = SettingsService.getCryptoServerEndpoint('ETH')
          this.mobileHeatwalletEndpoint = SettingsService.getCryptoServerEndpoint('ETH', 0, 'mobile-heatwallet')
      }
    );
  }

  parseInput(input: string) {
    return this.web3.toAscii(input)
  }

  getAddressNonce = (address: string) =>
    this.http.get(this.blockbookEndpoint + "/address/" + address).then(resp => {
        let respObj = angular.isString(resp) ? JSON.parse(resp) : resp
        if (respObj.nonce) {
            db.putValue(wlt.CACHE_KEY.addressInfo('ETH', address), resp)
            return respObj.nonce
        }
    })

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
      ).catch(reason => reject(reason))
    })
  }

  getGasPrice = () => {
    let oneGWei = 1
    return this.http.get(this.mobileHeatwalletEndpoint + "/fees/gas-price-extended/1").then(
        response => {
          if (!response) return oneGWei
          let r = angular.isString(response) ? JSON.parse(response) : response
          return r.proposeGasPriceGWei || oneGWei
        },
        reason => {
          return oneGWei
        }
    )
  }

  createRawTx2 = (account, to, value, gasPriceParam?, gasLimitParam?,
                  getAddressNonce?: (address: string) => PromiseLike<number>) => {
    return new Promise((resolve, reject) => {
      this.getGasPrice().then((gasPriceGWei) => {
        let getNonce = getAddressNonce || this.getAddressNonce
        return getNonce(account.address).then(
          nonce => {
            if (!nonce && nonce != 0) {
                resolve(null)
                return
            }
            let defaultGasLimit = this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)
            let txParams = {
              nonce: '0x' + Number(nonce).toString(16),
              gasLimit: this.web3.toHex(gasLimitParam || defaultGasLimit),
              gasPrice: this.web3.toHex(String(gasPriceParam || gasPriceGWei * Web3Service.GWEI_SCALE)),
              to: to,
              value: '0x' + Number(value).toString(16)
            }
            let tx
            try {
                tx = new this.$window.heatlibs.ethereumTx.Transaction(txParams)
            } catch (e) {
                reject(e?.message || e || "ETH transaction creation error")
                return
            }
            let privateKey = this.$window.heatlibs.safeBuffer.Buffer.from(account.privateKey, 'hex')
            tx.sign(privateKey)
            resolve('0x' + tx.serialize().toString('hex'))
          },
          reason => reject(reason)
        )
      })
    })
  }

  createTransferERC20RawTx = (account, to, contractAddress, value, gasPriceParam?, gasLimitParam?,
                  getAddressNonce?: (address: string) => PromiseLike<number>) => {
    return new Promise((resolve, reject) => {
      this.getGasPrice().then((gasPriceGWei) => {
        let getNonce = getAddressNonce || this.getAddressNonce
        return getNonce(account.address).then(
          nonce => {
            if (!nonce && nonce != 0) {
                resolve(null)
                return
            }
            let defaultGasLimit = this.settingsService.get(SettingsService.ETH_TX_GAS_REQUIRED)

            const param = {
              privateKey: account.privateKey.indexOf('0x') == 0 ? account.privateKey : '0x' + account.privateKey,
              to: to, // "0x2652a649aBa066D8C1e37B0A0C45dFD5E1c91527",
              contractAddress: contractAddress, //"0xd26114cd6EE289AccF82350c8d8487fedB8A0C07",
              value: value, // "10000",
              nonce: nonce, // 10,
              gasPrice: String(gasPriceParam || gasPriceGWei * Web3Service.GWEI_SCALE), // "20000000000",
              gasLimit: String(gasLimitParam || defaultGasLimit), // "21000",
              chainId: 1
            }
            heat.heatAppLib.ETHEREUM_TRANSFER_ERC20(param).then(bytes => {
              resolve(bytes)
            }).catch(e => {
              reject(e?.message || e || "ETH transaction creation error")
            })
          },
          reason => reject(reason)
        )
      })
    })
  }


}
