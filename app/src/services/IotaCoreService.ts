@Service('iotaCoreService')
@Inject('$window')
class IotaCoreService {

  private iotaCore;
  private converter;
  private signing;
  private bip39;

  constructor($window: angular.IWindowService) {
              this.iotaCore = $window.heatlibs.IotaCore;
              this.converter = $window.heatlibs.IotaConverter;
              this.signing = $window.heatlibs.IotaSigning;
              this.bip39 = $window.heatlibs.bip39;
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seed: string): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let walletType = this.getNWalletsFromMnemonics(seed, 1)
      resolve(walletType);
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

  getWallet(mnemonic: string, index: Number = 0, securityLevel: number = 2) {
    const address = this.iotaCore.generateAddress(mnemonic, 0, 2, false)
    return {
      address,
      privateKey: mnemonic
    }
  }


  refreshAdressBalances(wallet: WalletType) {
    return new Promise((resolve, reject) => {
      let walletAddress = wallet.addresses[0];
      let iotaBlockExplorerService: IotaBlockExplorerService = heat.$inject.get('iotaBlockExplorerService')
      iotaBlockExplorerService.getAccountInfo(walletAddress.privateKey).then(info => {
        walletAddress.inUse = info.transactions.length > 0;
        if (!walletAddress.inUse) {
          resolve(false)
        } else {
          walletAddress.balance = info.balance + ""
          resolve(true)
        }
      }, () => {
        resolve(false)
      })
    })
  }
}