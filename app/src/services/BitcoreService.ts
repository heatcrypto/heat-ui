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

  refreshAdressBalances(wallet: WalletType) {
    /* list all addresses in bip44 order */
    let addresses = wallet.addresses.map(a => a.address)
  }

  sendBitcoins(from: string, to: string, value: any) {
    console.log('bitcoin sent')
  }

  getBitcoinWallet(mnemonic: string, index:Number=0) {
    return new Promise((resolve, reject) => {
      try {
        var seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
        var HDPrivateKey = this.bitcore.HDPrivateKey;
        var hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'testnet')

        var derived = hdPrivateKey.derive(BitcoreService.BIP44 + index);
        var address = derived.privateKey.toAddress();
        var privateKey = derived.privateKey.toWIF();

        console.log('address ' + address)
        console.log('private key ' + privateKey)
        this.btcBlockExplorerService.getBalances(address)
        this.btcBlockExplorerService.getTransactions(address)
        this.$location.path('bitcoin-account/'+address)

      } catch (e) {
        console.error(e)
        reject()
      }
    })
  }

}