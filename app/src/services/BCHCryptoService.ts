@Service('bchCryptoService')
@Inject('$window', 'http', 'storage', '$rootScope')
class BCHCryptoService {

  static readonly BIP44 = "m/44'/145'/0'/0/";
  private bitcore;
  private bip39;
  private bitcoreCash;
  private store: Store;

  constructor($window: angular.IWindowService,
    private http: HttpService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;
    this.bitcoreCash = $window.heatlibs.bitcoreCash;
    this.store = storage.namespace('wallet-address', $rootScope, true);
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey);
      let encryptedWallet = this.store.get(`BCH-${heatAddress}`)
      if (encryptedWallet) {
        if(!encryptedWallet.data) {
          // Temporary fix. To remove unusable data from local storage
          this.store.remove(`BCH-${heatAddress}`)
          this.unlock(seedOrPrivateKey)
        }
        let decryptedWallet = heat.crypto.decryptMessage(encryptedWallet.data, encryptedWallet.nonce, heatAddress, seedOrPrivateKey)
        resolve(JSON.parse(decryptedWallet));
      } else if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        if (walletType.addresses.length === 20) {
          let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
          this.store.put(`BCH-${heatAddress}`, encryptedWallet);
          resolve(walletType);
        }
      } else if (this.bitcore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.bitcore.PrivateKey.fromWIF(seedOrPrivateKey)
          let address = privateKey.toAddress();
          let walletType = { addresses: [] }
          walletType.addresses[0] = { address: address.toString(), privateKey: privateKey.toString() }
          let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
          this.store.put(`BCH-${heatAddress}`, encryptedWallet);
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
      let wallet = this.getBitcoinCashWallet(mnemonic, i)
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
        let bchBlockExplorerService: BchBlockExplorerService = heat.$inject.get('bchBlockExplorerService')
        bchBlockExplorerService.getAddressInfo(address).then(info => {

          /* lookup the 'real' WalletAddress */
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

  getBitcoinCashWallet(mnemonic: string, index: Number = 0) {
    let seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    let HDPrivateKey = this.bitcore.HDPrivateKey;
    let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'mainnet')

    let derived = hdPrivateKey.derive(BCHCryptoService.BIP44 + index);
    let address = derived.privateKey.toAddress();
    let privateKey = derived.privateKey.toWIF();
    var cashAddress = this.bitcoreCash.Address.fromObject(address.toObject()).toCashAddress();
    return {
      address: cashAddress,
      privateKey: privateKey.toString()
    }
  }

  signTransaction(txObject: any, uncheckedSerialize: boolean = false): Promise<string> {
    let bitcoreCash = this.bitcoreCash
    let bchBlockExplorerService = <BchBlockExplorerService>heat.$inject.get('bchBlockExplorerService')
    return new Promise((resolve, reject) => {
      bchBlockExplorerService.getUnspentUtxos(txObject.from).then(utxos => {
        if (utxos.length === 0) {
          reject(new Error('No utxo found for input address'));
        }
        const script = bitcoreCash.Script.buildPublicKeyHashOut(txObject.from);
        const UnspentOutput = this.bitcoreCash.Transaction.UnspentOutput;
        let unspent = [];

        let availableSatoshis = 0;
        for (let i = 0; i < utxos.length; i += 1) {
          let utxo = {
            address: txObject.from,
            txId: utxos[i].txid,
            outputIndex: utxos[i].vout,
            satoshis: parseInt(utxos[i].value),
            script
          }
          unspent.push(new UnspentOutput(utxo))
          availableSatoshis += parseInt(utxos[i].value);
          if (availableSatoshis >= txObject.amount + txObject.fee) break;
        }

        if (availableSatoshis < txObject.amount + txObject.fee) {
          reject(new Error('Insufficient balance to broadcast transaction'))
        }

        try {
          let tx = this.bitcoreCash.Transaction();
          tx.from(unspent)
          tx.to(txObject.to, txObject.amount)
          tx.change(txObject.from)
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
    })
  }

  sendBitcoinCash(txObject: any): Promise<{ txId: string }> {
    let bchBlockExplorerService = <BchBlockExplorerService>heat.$inject.get('bchBlockExplorerService')
    return new Promise((resolve, reject) => {
      this.signTransaction(txObject).then(rawTx => {
        bchBlockExplorerService.broadcast(rawTx).then(
          data => {
            resolve({txId : data.result})
          },
          error => {
            reject(error)
          }
        )
      },
      error => {
        reject(error)
      })
    })
  }
}