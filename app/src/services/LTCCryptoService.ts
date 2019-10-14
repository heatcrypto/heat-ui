@Service('ltcCryptoService')
@Inject('$window', 'storage', '$rootScope')
class LTCCryptoService {

  static readonly BIP44 = "m/44'/2'/0'/0/";
  private litecore;
  private bip39;
  private store: Store;

  constructor($window: angular.IWindowService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.litecore = $window.heatlibs.litecore;
    this.bip39 = $window.heatlibs.bip39;
    this.store = storage.namespace('wallet-address', $rootScope, true);
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey);
      let encryptedWallet = this.store.get(`LTC-${heatAddress}`)
      if (encryptedWallet) {
        if(!encryptedWallet.data) {
          // Temporary fix. To remove unusable data from local storage
          this.store.remove(`LTC-${heatAddress}`)
          this.unlock(seedOrPrivateKey)
        }
        let decryptedWallet = heat.crypto.decryptMessage(encryptedWallet.data, encryptedWallet.nonce, heatAddress, seedOrPrivateKey)
        resolve(JSON.parse(decryptedWallet));
      } else if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
        this.store.put(`LTC-${heatAddress}`, encryptedWallet);
        resolve(walletType);
      } else if (this.litecore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.litecore.PrivateKey.fromWIF(seedOrPrivateKey)
          let address = privateKey.toAddress();
          let walletType = { addresses: [] }
          walletType.addresses[0] = { address: address.toString(), privateKey: privateKey.toString() }
          let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
          this.store.put(`LTC-${heatAddress}`, encryptedWallet);
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

          walletAddress.inUse = info.txs != 0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = parseFloat(info.balance) / 100000000 + ""
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
      ltcBlockExplorerService.getUnspentUtxos(txObject.sender).then(utxos => {
        if (utxos.length === 0) {
          reject(new Error('No utxo found'));
        }
        ltcBlockExplorerService.getTxInfo(utxos[0].txid).then(txData => {
          let script = ""
          for (let i = 0; i < txData.vout.length; i += 1) {
            if (txData.vout[i].addresses[0] === txObject.sender) {
              script = txData.vout[i].hex
              break
            }
          }

          let unspent = [];
          let availableSatoshis = 0;
          for (let i = 0; i < utxos.length; i += 1) {
            let utxo = {
              txid: utxos[i].txid,
              vout: utxos[i].vout,
              satoshis: parseInt(utxos[i].value),
              script
            }
            unspent.push(utxo)
            availableSatoshis += parseInt(utxos[i].value);
            if (availableSatoshis >= txObject.value + txObject.fee) break;
          }

          if (availableSatoshis < txObject.value + txObject.fee) {
            reject(new Error('Insufficient balance to broadcast transaction'))
          }

          try {
            let tx = this.litecore.Transaction();
            tx.from(unspent)
            tx.to(txObject.recipient, txObject.value)
            tx.change(txObject.sender)
            tx.fee(txObject.fee)
            tx.sign(txObject.privateKey)
            let rawTx = uncheckedSerialize ? tx.uncheckedSerialize() : tx.serialize()
            resolve(rawTx)
          } catch (err) {
            reject(err)
          }
        },
        err => {
          reject(err)
        })
      },
      err => {
        reject(err)
      })
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