@Service('fimkCryptoService')
@Inject('$window', 'mofoSocketService', '$rootScope')
class FIMKCryptoService {

  private nxtCrypto;
  private socket;

  constructor(private $window: angular.IWindowService,
    private mofoSocketService: MofoSocketService,
    private $rootScope: angular.IRootScopeService) {
    this.nxtCrypto = $window.heatlibs.nxtCrypto;
    this.socket = this.mofoSocketService.mofoSocket();
  }

  /* Sets the seed to this wallet */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let walletType = { addresses: [] }
      walletType.addresses[0] = { address: this.nxtCrypto.getAccountRSFromSecretPhrase(seedOrPrivateKey, 'FIM'), privateKey: seedOrPrivateKey }
      resolve(walletType);
    });
  }

  refreshAdressBalances(wallet: WalletType) {
    let address = wallet.addresses[0].address
    return new Promise((resolve, reject) => {
      let mofoSocketService: MofoSocketService = heat.$inject.get('mofoSocketService')
      mofoSocketService.getTransactions(address).then(transactions => {
        mofoSocketService.getAccount(address).then(info => {
          wallet.addresses[0].inUse = true;
          let balance = parseInt(info.unconfirmedBalanceNQT) / 100000000;
          let formattedBalance = new Big(balance + "")
          let balanceUnconfirmed = new Big(formattedBalance).toFixed(8);
          wallet.addresses[0].balance = balanceUnconfirmed
          mofoSocketService.getAccountAssets(address).then(accountAssets => {
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
        })
      }, err => {
          resolve(false)
      })
    })
  }
}