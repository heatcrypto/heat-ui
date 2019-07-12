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

  getWallet(mnemonic: string, index: Number = 0, securityLevel: number = 2): any {
    const address = this.iotaCore.generateAddress(mnemonic, index, securityLevel, false)
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
        if (info.inputs !== []) {
          let index = 0;
          wallet.addresses = [];
          info.inputs.forEach(input => {
            let walletAddress: any = {};
            walletAddress.inUse = true;
            walletAddress.balance = input.balance + ""
            walletAddress.address = input.address
            walletAddress.privateKey = secretPhrase // keep same private key (should be treated as seed) until iota offline signing is done
            index = input.keyIndex;
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