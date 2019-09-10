@Service('ardorCryptoService')
@Inject('$window', 'user', 'storage', '$rootScope')
class ARDORCryptoService {

  private nxtCrypto;
  private store: Store;

  constructor(private $window: angular.IWindowService,
    private user: UserService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.nxtCrypto = $window.heatlibs.nxtCrypto;
      this.store = storage.namespace('wallet-address', $rootScope, true);
  }

  /* Sets the seed to this wallet */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey);
      let walletAddresses = this.store.get(`ARDR-${heatAddress}`)
      if (walletAddresses) {
        resolve(walletAddresses);
      } else {
        let walletType = { addresses: [] }
        let publicKey = this.nxtCrypto.getPublicKey(seedOrPrivateKey)
        let address = this.nxtCrypto.getAccountRSFromSecretPhrase(seedOrPrivateKey, 'ARDOR')
        let accountId = this.nxtCrypto.getAccountId(publicKey)
        walletType.addresses[0] = { address: address, privateKey: seedOrPrivateKey, accountId: accountId }
          this.store.put(`ARDR-${heatAddress}`, walletType);
        resolve(walletType);
      }
    });
  }

  refreshAdressBalances(wallet: WalletType) {
    let userAccount = wallet.addresses[0].accountId;
    return new Promise((resolve, reject) => {
      let ardorBlockExplorerService: ArdorBlockExplorerService = heat.$inject.get('ardorBlockExplorerService')
      ardorBlockExplorerService.getTransactions(userAccount, 0, 10).then(transactions => {
        if (transactions.length != 0) {
          ardorBlockExplorerService.getBalance(userAccount).then(balance => {
            wallet.addresses[0].balance = new Big(utils.convertToQNTf(balance)).toFixed(8);
            wallet.addresses[0].inUse = true;
            ardorBlockExplorerService.getAccountAssets(userAccount).then(accountAssets => {
              wallet.addresses[0].tokensBalances = []
              let promises = []
              accountAssets.forEach(asset => {
                let promise = ardorBlockExplorerService.getAssetInfo(asset.asset).then(assetInfo => {
                  wallet.addresses[0].tokensBalances.push({
                    symbol: assetInfo?assetInfo.name:'',
                    name: assetInfo?assetInfo.name:'',
                    decimals: assetInfo.decimals,
                    balance: utils.formatQNT(asset.unconfirmedQuantityQNT,assetInfo.decimals),
                    address: asset.asset
                  })
                })
                promises.push(promise)
              });

              Promise.all(promises).then(() => resolve(true))

              if (accountAssets.length === 0)
                resolve(true)
            })
          })
        } else {
          resolve(false)
        }
      })
    })
  }
}