@Service('bitcoreService')
@Inject('$window', 'btcBlockExplorerService', '$location')
class BitcoreService {

  //public wallet: WalletType
  static readonly BIP44 = "m/44'/0'/0'/0/";
  private bitcore;
  private bip39;
  private explorers;

  constructor(private $window: angular.IWindowService,
    private btcBlockExplorerService: BtcBlockExplorerService,
    private $location: angular.ILocationService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;
    this.explorers = $window.heatlibs.explorers;
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

        /* look up its data on btcBlockExplorerService */
        let btcBlockExplorerService: BtcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getAddressInfo(address).then(info => {

          /* lookup the 'real' WalletAddress */
          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress)
            return

          walletAddress.inUse = info.txApperances!=0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = info.balance+""
          resolve(true)
        }, () => {
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

  sendBitcoins(from: any, to: string, value: number): Promise<{ txId:string }> {
    let insight = new this.explorers.Insight('testnet');

    return new Promise ((resolve, reject) => {
      insight.getUnspentUtxos(from.address, (err, utxos) => {
        if (err) {
          console.log('Error getting UTXOs ' + err)
          reject(err)
        } else {
          let tx = this.bitcore.Transaction();
          tx.from(utxos)
          tx.to(to, 1000000)
          tx.change(from.address)
          tx.fee(50000)
          tx.sign(from.privateKey)
          tx.serialize();

          this.broadcastTransaction(insight, tx).then(data => {
            resolve(data)
          }, err => {
            reject(err)
          })
        }
      });
    })
  }

  private broadcastTransaction (insight: any, tx: any): Promise<{ txId:string }> {
    return new Promise((resolve, reject) => {
      insight.broadcast(tx, (err, txId) => {
        if(err) {
          console.log('Error broadcasting transaction ' + err)
          reject(err)
        } else {
          console.log('transfer success ' + txId)
          resolve({
            txId: txId
          })
        }
      })
    })
  }

  getBitcoinWallet(mnemonic: string, index: Number = 0) {

    let seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    let HDPrivateKey = this.bitcore.HDPrivateKey;
    let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'testnet')

    let derived = hdPrivateKey.derive(BitcoreService.BIP44 + index);
    let address = derived.privateKey.toAddress();
    let privateKey = derived.privateKey.toWIF();
    return {
      address: address.toString(),
      privateKey: privateKey.toString()
    }
  }
}