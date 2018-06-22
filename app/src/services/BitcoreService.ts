@Service('bitcoreService')
@Inject('$window', 'btcBlockExplorerService', '$location')
class BitcoreService {

  //public wallet: WalletType
  static readonly BIP44 = "m/44'/0'/0'/0/";
  private bitcore;
  private bip39;

  constructor(private $window: angular.IWindowService,
    private btcBlockExplorerService: BtcBlockExplorerService,
    private $location: angular.ILocationService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;

  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: string): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)

      if(walletType.addresses.length === 20){
        resolve(walletType);
      }
      else {
        reject();
      }
    });
  }

  getNWalletsFromMnemonics(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let wallet = this.getBitcoinWallet(mnemonic, i)
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

        /* look up its data on ethplorer */
        // let ethplorer: EthplorerService = heat.$inject.get('ethplorer')
        // ethplorer.getAddressInfo(address).then(info => {

        //   /* lookup the 'real' WalletAddress */
        //   let walletAddress = wallet.addresses.find(x => x.address == address)
        //   if (!walletAddress)
        //     return

        //   walletAddress.inUse = info.countTxs!=0
        //   if (!walletAddress.inUse) {
        //     resolve(false)
        //     return
        //   }

        //   walletAddress.balance = info.ETH.balance+""
        //   walletAddress.tokensBalances = []
        //   resolve(true)
        // }, () => {
        //   resolve(false)
        // })

        // remove this line after uncommenting above code
        resolve(true)
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

  sendBitcoins(from: string, to: string, value: any) {
    console.log('bitcoin sent')
  }

  getBitcoinWallet(mnemonic: string, index: Number = 0) {

    var seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    var HDPrivateKey = this.bitcore.HDPrivateKey;
    var hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'testnet')

    var derived = hdPrivateKey.derive(BitcoreService.BIP44 + index);
    var address = derived.privateKey.toAddress();
    var privateKey = derived.privateKey.toWIF();

    return {
      address: address.toString(),
      privateKey: privateKey.toString()
    }
  }
}