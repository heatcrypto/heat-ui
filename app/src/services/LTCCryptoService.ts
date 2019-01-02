@Service('ltcCryptoService')
@Inject('$window', 'http')
class LTCCryptoService {

  static readonly BIP44 = "m/44'/2'/0'/0/";
  private litecore;
  private bip39;

  constructor($window: angular.IWindowService,
    private http: HttpService) {
    this.litecore = $window.heatlibs.litecore;
    this.bip39 = $window.heatlibs.bip39;
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        resolve(walletType);
      } else if (this.litecore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.litecore.PrivateKey.fromWIF(seedOrPrivateKey)
          let address = privateKey.toAddress();
          let walletType = { addresses: [] }
          walletType.addresses[0] = { address: address.toString(), privateKey: privateKey.toString() }
          resolve(walletType)
        } catch (e) {
          // resolve empty promise if private key is not of this network so that next .then executes
          resolve()
        }
      }
      else {
        reject();
      }
    });
  }

  getNWalletsFromMnemonics(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let wallet = this.getLitecoinWallet(mnemonic, i)
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

        let ltcBlockExplorerService: LtcBlockExplorerService = heat.$inject.get('ltcBlockExplorerService')
        ltcBlockExplorerService.getAddressInfo(address).then(info => {

          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress)
            return

          walletAddress.inUse = info.final_n_tx != 0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = info.final_balance / 100000000 + ""
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

  signTransaction(txObject: any, uncheckedSerialize: boolean = false): Promise<string> {
    let ltcBlockExplorerService = <LtcBlockExplorerService>heat.$inject.get('ltcBlockExplorerService')
    return new Promise((resolve, reject) => {
      ltcBlockExplorerService.newTransaction(txObject.tx).then(
        data => {
          let unspent = [];
          data.tx.inputs.forEach(input => {
            let utxo = {
              txid: input.prev_hash,
              vout: input.output_index,
              satoshis: input.output_value,
              script: ''
            }
            data.tx.outputs.forEach(output => {
              output.addresses.forEach(address => {
                if(address == txObject.sender) {
                  utxo.script = output.script
                }
              });
            });
            unspent.push(utxo)
          });

          try {
            let tx = this.litecore.Transaction();
            tx.from(unspent)
            tx.to(txObject.recipient, txObject.value)
            tx.change(txObject.sender)
            tx.fee(txObject.fee)
            tx.sign(txObject.privateKey)
            let rawTx;
            if (uncheckedSerialize)
              rawTx = tx.uncheckedSerialize()
            else
              rawTx = tx.serialize()
            data.signatures = [rawTx]
            data.pubkeys = [txObject.publicKey]
            resolve(data)

          } catch (err) {
            reject(err)
          }
        },
        err => {
          reject(err)
        }
      )
    })
  }

  getLitecoinWallet(mnemonic: string, index: Number = 0) {
    let seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    let HDPrivateKey = this.litecore.HDPrivateKey;
    let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'mainnet')

    let derived = hdPrivateKey.derive(LTCCryptoService.BIP44 + index);
    let address = derived.privateKey.toAddress();
    let privateKey = derived.privateKey.toWIF();
    return {
      address: address.toString(),
      privateKey: privateKey.toString()
    }
  }

}