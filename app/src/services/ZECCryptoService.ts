@Service('zecCryptoService')
@Inject('$window', 'storage', '$rootScope')
class ZECCryptoService {

  static readonly BIP44 = "m/44'/133'/0'/0/";
  private bitcore;
  private bip39;
  private store: Store;
  private safeBuffer;
  private bitgoUtxo;

  constructor($window: angular.IWindowService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;
    this.store = storage.namespace('wallet-address', $rootScope, true);
    this.safeBuffer = $window.heatlibs.safeBuffer;
    this.bitgoUtxo = $window.heatlibs.bitgoUtxo;
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey);
      let walletAddresses = this.store.get(`ZEC-${heatAddress}`)
      if (walletAddresses) {
        resolve(walletAddresses);
      } else if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        if (walletType.addresses.length === 20) {
          this.store.put(`ZEC-${heatAddress}`, walletType);
          resolve(walletType);
        }
      } else if (this.bitcore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.bitcore.PrivateKey.fromWIF(seedOrPrivateKey)
          let address = privateKey.toAddress();
          let walletType = { addresses: [] }
          walletType.addresses[0] = { address: address.toString(), privateKey: privateKey.toString() }
          this.store.put(`ZEC-${heatAddress}`, walletType);
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
      let wallet = this.getZcashWallet(mnemonic, i)
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
        let zecBlockExplorerService: ZecBlockExplorerService = heat.$inject.get('zecBlockExplorerService')
        zecBlockExplorerService.getAddressInfo(address).then(info => {
          /* lookup the 'real' WalletAddress */
          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress)
            return

          walletAddress.inUse = info.txApperances != 0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = info.balance.toFixed(8) + ""
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
    let zecBlockExplorerService: ZecBlockExplorerService = heat.$inject.get('zecBlockExplorerService')
    return new Promise((resolve, reject) => {
      zecBlockExplorerService.getUnspentUtxos(txObject.from).then(utxos => {
        zecBlockExplorerService.getBlockHeight().then(blockHeight => {
          try {
            const zecNetwork = this.bitgoUtxo.networks.zcash;
            const tx = new this.bitgoUtxo.TransactionBuilder(zecNetwork);
            const expiryHeight = blockHeight + 50;
            tx.setVersion(this.bitgoUtxo.Transaction.ZCASH_SAPLING_VERSION);  // 4
            tx.setVersionGroupId(parseInt('0x892F2085', 16));
            tx.setLockTime(0);
            tx.setExpiryHeight(expiryHeight);

            let nInputs = 0;
            let availableSatoshis = 0;
            for (let i = 0; i < utxos.length; i += 1) {
              const utxo = utxos[i];
              tx.addInput(utxo.txId, utxo.outputIndex);
              availableSatoshis += utxo.satoshis;
              nInputs += 1;
              if (availableSatoshis >= txObject.amount + txObject.fee) break;
            }

            const change = availableSatoshis - txObject.amount - txObject.fee;
            if (availableSatoshis < txObject.amount + txObject.fee) {
              throw new Error('Insufficient balance to broadcast transaction');
            }

            tx.addOutput(txObject.to, txObject.amount);
            if (change > 0) tx.addOutput(txObject.from, change);

            let keyPair = this.bitgoUtxo.ECPair.fromWIF(txObject.privateKey, zecNetwork);
            for (let i = 0; i < nInputs; i += 1) {
              tx.sign(i, keyPair, '', this.bitgoUtxo.Transaction.SIGHASH_SINGLE, utxos[i].satoshis);
            }
            const rawTx = tx.build().toHex();
            resolve(rawTx);
          } catch (err) {
            reject(err)
          }
        })
      },
      err => {
        reject(err)
      })
    })
  }

  sendZcash(txObject: any): Promise<{ txId: string }> {
    let zecBlockExplorerService: ZecBlockExplorerService = heat.$inject.get('zecBlockExplorerService')
    return new Promise((resolve, reject) => {
      this.signTransaction(txObject).then(rawTx => {
        zecBlockExplorerService.broadcast(rawTx).then(
          txId => {
            resolve({ txId : txId.txId })
          },
          error => {
            reject(error)
          }
        )
      })
    })
  }

  getZcashWallet(mnemonic: string, index: Number = 0) {
    let seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    let HDPrivateKey = this.bitcore.HDPrivateKey;
    let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'mainnet')
    let derived = hdPrivateKey.derive(ZECCryptoService.BIP44 + index);

    let pubKeyHash = '1cb8';
    let publicKey = derived.privateKey.toPublicKey();
    let pubHash160 = pubKeyHash + this.bitcore.crypto.Hash.sha256ripemd160(publicKey.toBuffer()).toString('hex')
    let address = this.bitcore.encoding.Base58Check.encode(this.safeBuffer.Buffer.from(pubHash160, 'hex'))
    let privateKey = derived.privateKey.toWIF();
    return {
      address: address.toString(),
      privateKey: privateKey.toString()
    }
  }
}