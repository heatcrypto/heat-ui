@Service('iotaCoreService')
@Inject('$window')
class IotaCoreService {

  private iotaCore;

  constructor($window: angular.IWindowService) {
              this.iotaCore = $window.heatlibs.IotaCore;
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
      let iotaBlockExplorerService: IotaBlockExplorerService = heat.$inject.get('iotaBlockExplorerService')
      iotaBlockExplorerService.getInputs(wallet.addresses[0].privateKey).then(info => {
        info.inputs.forEach(input => {
          let walletAddress: any = {};
          walletAddress.inUse = true;
          walletAddress.balance = input.balance + ""
          walletAddress.address = input.address
          walletAddress.privateKey = wallet.addresses[0].privateKey // keep same private key (should be treated as seed) until iota offline signing is done
          wallet.addresses.push(walletAddress)
      })
        resolve(true)
      }, () => {
        resolve(false)
      })
    })
  }
}