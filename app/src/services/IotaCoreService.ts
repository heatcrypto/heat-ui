@Service('iotaCoreService')
@Inject('$window', 'storage', '$rootScope')
class IotaCoreService {

  private iotaCore;
  private store: Store;

  constructor($window: angular.IWindowService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.iotaCore = $window.heatlibs.IotaCore;
    this.store = storage.namespace('wallet-address', $rootScope, true);
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seed: string): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seed);
      let encryptedWallet = this.store.get(`IOTA-${heatAddress}`)
      if (encryptedWallet) {
        if(!encryptedWallet.data) {
          // Temporary fix. To remove unusable data from local storage
          this.store.remove(`IOTA-${heatAddress}`)
          this.unlock(seed)
        }
        let decryptedWallet = heat.crypto.decryptMessage(encryptedWallet.data, encryptedWallet.nonce, heatAddress, seed)
        resolve(JSON.parse(decryptedWallet));
      } else {
        let walletType = this.getNWalletsFromMnemonics(seed, 1)
        let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seed)
        this.store.put(`IOTA-${heatAddress}`, encryptedWallet);
        resolve(walletType);
      }
    });
  }

  getNWalletsFromMnemonics(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let wallet = this.getWallet(mnemonic, i, 2)
      walletType.addresses[i] = { address: wallet.address, privateKey: wallet.privateKey, index: i, balance: "0", inUse: false }
    }
    return walletType;
  }

  getWallet(mnemonic: string, index: Number = 0, securityLevel: number = 2): any {
    const address = this.iotaCore.generateAddress(mnemonic, index, securityLevel, true)
    return {
      address,
      privateKey: mnemonic
    }
  }


  refreshAdressBalances(wallet: WalletType) {
    return new Promise((resolve, reject) => {
      let secretPhrase = wallet.addresses[0].privateKey;
      let iotaBlockExplorerService: IotaBlockExplorerService = heat.$inject.get('iotaBlockExplorerService')
      iotaBlockExplorerService.getInputs(wallet.addresses[0].privateKey).then(info => {
        if (info.inputs && info.inputs.length !== 0) {
          let index = 0;
          wallet.addresses = [];
          info.inputs.forEach(input => {
            let walletAddress: any = {};
            walletAddress.inUse = true;
            walletAddress.balance = input.balance + ""
            walletAddress.privateKey = secretPhrase // keep same private key (should be treated as seed) until iota offline signing is done
            walletAddress.address = this.getWallet(secretPhrase, input.keyIndex).address // using address from getWallet instead of api returned address since users need address with cehcksum
            wallet.addresses.push(walletAddress)
          })
          let zeroBalanceAccount = this.getWallet(secretPhrase, ++index)
          zeroBalanceAccount.inUse = true;
          zeroBalanceAccount.balance = "0"
          wallet.addresses.push(zeroBalanceAccount)
        }
        else {
          let zeroBalanceAccount = this.getWallet(secretPhrase)
          zeroBalanceAccount.inUse = true;
          zeroBalanceAccount.balance = "0"
          wallet.addresses.push(zeroBalanceAccount)
        }
        resolve(true)
      }, () => {
        resolve(false)
      })
    })
  }
}