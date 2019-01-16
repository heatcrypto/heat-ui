@Service('bitcoreService')
@Inject('$window', 'http')
class BitcoreService {

  static readonly BIP44 = "m/44'/0'/0'/0/";
  private bitcore;
  private bip39;

  constructor($window: angular.IWindowService,
    private http: HttpService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        if (walletType.addresses.length === 20) {
          resolve(walletType);
        }
      } else if (this.bitcore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.bitcore.PrivateKey.fromWIF(seedOrPrivateKey)
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

          walletAddress.inUse = info.txApperances != 0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = info.balanceSat / 100000000 + ""
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
    return new Promise((resolve, reject) => {
      this.getUnspentUtxos(txObject.from).then(
        utxos => {
          try {
            let tx = this.bitcore.Transaction();
            tx.from(utxos)
            tx.to(txObject.to, txObject.amount)
            tx.change(txObject.from)
            tx.fee(txObject.fee)
            tx.sign(txObject.privateKey)
            let rawTx;
            if(uncheckedSerialize)
              rawTx = tx.uncheckedSerialize()
            else
              rawTx = tx.serialize()
            resolve(rawTx)

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

  sendBitcoins(txObject: any): Promise<{ txId: string, message: string }> {
    return new Promise((resolve, reject) => {
      this.signTransaction(txObject).then(rawTx => {
        this.broadcast(rawTx).then(
          txId => {
            resolve({txId : txId.txId, message: ''})
          },
          error => {
            reject(error)
          }
        )
      })
    })
  }

  getBitcoinWallet(mnemonic: string, index: Number = 0) {

    let seedHex = this.bip39.mnemonicToSeedHex(mnemonic)
    let HDPrivateKey = this.bitcore.HDPrivateKey;
    let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, 'mainnet')

    let derived = hdPrivateKey.derive(BitcoreService.BIP44 + index);
    let address = derived.privateKey.toAddress();
    let privateKey = derived.privateKey.toWIF();
    return {
      address: address.toString(),
      privateKey: privateKey.toString()
    }
  }

  getUnspentUtxos(addresses) {
    const Address = this.bitcore.Address;
    const Transaction = this.bitcore.Transaction;
    const UnspentOutput = Transaction.UnspentOutput;
    return new Promise((resolve, reject) => {
      if (!Array.isArray(addresses)) {
        addresses = [addresses];
      }
      addresses = addresses.map((address) => new Address(address));
      this.http.post(`${BtcBlockExplorerService.endPoint}/addrs/utxo`, {
        addrs: addresses.map((address) => address.toString()).join(',')
      }).then(
        response => {
          try {
            resolve((<[any]>response).map(unspent => new UnspentOutput(unspent)))
          } catch (ex) {
            reject(ex);
          }
        },
        error => {
          reject(error)
        }
      )
    })
  }

  broadcast(rawTx: string) {
    return new Promise<{ txId: string }>((resolve, reject) => {
      this.http.post(`${BtcBlockExplorerService.endPoint}/tx/send`, { rawtx: rawTx }).then(
        response => {
          let txId = response ? response['txid'] : null
          resolve({ txId: txId })
        },
        error => {
          reject(error)
        }
      )
    })
  }

}