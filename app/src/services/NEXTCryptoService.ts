@Service('nextCryptoService')
@Inject('$window')
class NEXTCryptoService {

  private nxtCrypto;

  constructor(private $window: angular.IWindowService) {
    this.nxtCrypto = $window.heatlibs.nxtCrypto;
  }

  /* Sets the seed to this wallet */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let walletType = { addresses: [] }
      walletType.addresses[0] = { address: this.nxtCrypto.getAccountRSFromSecretPhrase(seedOrPrivateKey, 'NXT'), privateKey: seedOrPrivateKey }
      resolve(walletType);
    });
  }

  refreshAdressBalances(wallet: WalletType) {
    let address = wallet.addresses[0].address
    return new Promise((resolve, reject) => {
      let nextBlockExplorerService: NextBlockExplorerService = heat.$inject.get('nextBlockExplorerService')
      nextBlockExplorerService.getAccount(wallet.addresses[0].address).then(data => {
        wallet.addresses[0].balance = new Big(utils.convertToQNTf(data.unconfirmedBalanceNQT)).toFixed(8);
        wallet.addresses[0].inUse = true;
        nextBlockExplorerService.getAccountAssets(address).then(accountAssets => {
          wallet.addresses[0].tokensBalances = []
          accountAssets.forEach(asset => {
            wallet.addresses[0].tokensBalances.push({
              symbol: asset?asset.name:'',
              name: asset?asset.name:'',
              decimals: asset.decimals,
              balance: utils.formatQNT(asset.unconfirmedQuantityQNT,asset.decimals),
              address: asset.asset
            })
          });
          resolve(true)
        })
      }, err => {
        resolve(false)
      })
    })
  }
}