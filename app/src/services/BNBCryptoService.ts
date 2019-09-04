@Service('bnbCryptoService')
@Inject('$window')
class BNBCryptoService {
  private bnb: any;

  constructor(private $window: angular.IWindowService) {
    this.bnb = $window.heatlibs.bnb;
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      if (this.bnb.crypto.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        if (walletType.addresses.length === 20) {
          resolve(walletType);
        }
      } else {
        reject();
      }
    });
  }

  getNWalletsFromMnemonics(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let wallet = this.getBinanceWallet(mnemonic, i)
      walletType.addresses[i] = { address: wallet.address, privateKey: wallet.privateKey, index: i, balance: "0", inUse: false }
    }
    return walletType;
  }

  refreshAdressBalances(wallet: WalletType) {
    /* list all addresses in bip44 order */
    let addresses = wallet.addresses.map(a => a.address)

    function processNext() {
      return new Promise((resolve, reject) => {

        /* get the first element from the list */
        let address = addresses[0]
        addresses.shift()

        /* look up its data on btcBlockExplorerService */
        let bnbBlockExplorerService: BnbBlockExplorerService = heat.$inject.get('bnbBlockExplorerService')
          bnbBlockExplorerService.getAddressInfo(address).then(info => {
            /* lookup the 'real' WalletAddress */
            let walletAddress = wallet.addresses.find(x => x.address == address)
            if (!walletAddress)
              return
            walletAddress.inUse = true
            let totalBalance = 0;
            let accountAssets = info.balances.reduce(function (accumulator,b) {
              if (b.symbol === 'BNB') {
                totalBalance += parseFloat(b.free);
              } else {
                if (!accumulator[b.symbol]) {
                  accumulator[b.symbol] = {
                    symbol: b.symbol?b.symbol:'',
                    free: 0
                  };
                }
                accumulator[b.symbol].free += parseFloat(b.free);  
              }
              return accumulator;
            }, {});

            walletAddress.balance = totalBalance + "";
            walletAddress.tokensBalances = []
            accountAssets = Object["values"](accountAssets);
            accountAssets.forEach(asset => {
              walletAddress.tokensBalances.push({
                symbol: asset.symbol,
                name: asset.symbol,
                decimals: 8,
                balance: asset.free.toFixed(8),
                address: ''
              })
            })
            resolve(true)
          }, () => {
            resolve(false)
          }).catch((err) => {
            resolve(false)
          })
      })
    }

    let recurseToNext = function recurseToNext(resolve) {
      processNext().then(
        hasMore => {
          if (hasMore) {
            setTimeout(function () {
              recurseToNext(resolve)
            }, 100)
          }
          else {
            resolve()
          }
        }
      )
    }

    return new Promise(resolve => {
      recurseToNext(resolve)
    })
  }

  sendBinanceCoins(txObject: any): Promise<{ txId: string, message: string }> {
    let bnbBlockExplorerService: BnbBlockExplorerService = heat.$inject.get('bnbBlockExplorerService')
    return new Promise((resolve, reject) => {
      bnbBlockExplorerService.broadcast(txObject).then(
        result => {
          resolve({txId : result.hash, message: ''})
        },
        error => {
          reject({message: error})
        }
      )
    })
  }

  getBinanceWallet(mnemonic: string, index: Number = 0) {
    const privateKey = this.bnb.crypto.getPrivateKeyFromMnemonic(mnemonic, true, index);
    let address = this.bnb.crypto.getAddressFromPrivateKey(privateKey);
    return {
      address: address,
      privateKey: privateKey
    }
  }
}