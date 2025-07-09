@Service('bitcoreService')
@Inject('$window', 'storage', '$rootScope')
class BitcoreService {

  static readonly BIP44_PATH = () => wlt.CURRENCIES.Bitcoin.network == 'bitcoin' ? "m/44'/0'/0'/0/" : "m/44'/1'/0'/0/"
  static readonly BIP49_PATH = () => wlt.CURRENCIES.Bitcoin.network == 'bitcoin' ? "m/49'/0'/0'/0/" : "m/49'/1'/0'/0/"
  static readonly BIP84_PATH = () => wlt.CURRENCIES.Bitcoin.network == 'bitcoin' ? "m/84'/0'/0'/0/" : "m/84'/1'/0'/0/"
  private bitcore;
  private bip39;
  private store: Store;

  private BITCOIN_MESSAGE_MAGIC_BYTES

  constructor(private $window: angular.IWindowService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.bitcore = $window.heatlibs.bitcore;
    this.bip39 = $window.heatlibs.bip39;
    this.store = storage.namespace('wallet-address', $rootScope, true);
    this.BITCOIN_MESSAGE_MAGIC_BYTES = new this.bitcore.deps.Buffer('Bitcoin Signed Message:\n')
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(walletAddresses: WalletAddresses, seedOrPrivateKey: any, reset?: boolean): Promise<WalletAddresses> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey)
      if (walletAddresses) {
        resolve(walletAddresses)
      } else if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.generateAddresses(seedOrPrivateKey, 20)
        if (walletType.addresses.length === 20) {
          let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
          this.store.put(`BTC-${heatAddress}`, encryptedWallet);
          resolve(walletType);
        }
      } else if (this.bitcore.PrivateKey.isValid(seedOrPrivateKey)) {
        try {
          let privateKey = this.bitcore.PrivateKey.fromWIF(seedOrPrivateKey)
          let address = privateKey.toAddress();
          let walletType = { addresses: [] }
          walletType.addresses[0] = { address: address.toString(), privateKey: privateKey.toWIF() }
          let encryptedWallet = heat.crypto.encryptMessage(JSON.stringify(walletType), heatAddress, seedOrPrivateKey)
          this.store.put(`BTC-${heatAddress}`, encryptedWallet);
          resolve(walletType)
        } catch (e) {
          // resolve empty promise if private key is not of this network so that next .then executes
          resolve(null)
        }
      }
      else {
        reject("Seed (or private key) is not valid for currency")
      }
    });
  }

  generateAddresses(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let a = this.generateBitcoinAddress(mnemonic, i)
      // let a = this.generateSegwitBitcoinAddress(mnemonic, i)
      walletType.addresses[i] = { address: a.address, privateKey: a.privateKey, index: i, balance: "0", inUse: false }
    }
    return walletType;
  }

  refreshBalances(wallet: WalletAddresses, btcCurrencyAddressLoading: wlt.CurrencyAddressLoading) {
    /* list all addresses in bip44 order */
    wallet.addresses.forEach(value => value.balance = "")  // balances are unknown until load from blockchain
    let addresses = wallet.addresses.filter(a => !a.isDeleted).map(a => a.address)
    let emptyAddressCounter = 0

    function processNext() {
      return new Promise((resolve, reject) => {

        /* get the first element from the list */
        let address = addresses.shift()
        if (!address) {
          resolve(false)
          return
        }

        btcCurrencyAddressLoading.address = address

        /* look up its data on btcBlockExplorerService */
        let btcBlockExplorerService: BtcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
        btcBlockExplorerService.getAddressInfo(address, true).then(info => {

          /* lookup the 'real' WalletAddress */
          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress) {
            console.error(`Address ${address} is not found among addresses`, wallet.addresses)
            resolve(false)
            return
          }

          emptyAddressCounter++

          walletAddress.balance = info.balanceSat == undefined ? "" : info.balanceSat / 100000000 + ""
          walletAddress.inUse = info.txApperances ? info.txApperances != 0 : null

          if (walletAddress.inUse) emptyAddressCounter = 0  // reset counter since need extra unused addresses

          // if there are 2 zero addresses in a row, then we do not load the addresses further
          if (emptyAddressCounter >= 2) {
            resolve(false)
            return
          }
          resolve(true)
        }).catch(reason => {
          console.error(reason)
          reject(reason)
        })
      })
    }

    let recurseToNext = function recurseToNext(resolve, reject) {
      processNext().then(
        hasMore => {
          if (hasMore) {
            setTimeout(function () {
              recurseToNext(resolve, reject)
            }, 100)
          } else {
            resolve(null)
          }
        }
      ).catch(reason => reject(reason))
    }

    return new Promise((resolve, reject) => {
      recurseToNext(resolve, reject)
    })
  }

  createOneToOneTransaction(txObject: any, uncheckedSerialize: boolean = false, utxoData?: string): Promise<string> {
    let btcBlockExplorerService: BtcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')

    return new Promise((resolve, reject) => {
      const createTx = (utxos) => {
        const privateKeyHex = heat.heatAppLib.BITCOIN_WIF_TO_HEX({privateKey: txObject.privateKey, network: wlt.CURRENCIES.Bitcoin.network})

        let inputs = utxos.map(v => ({
          vout: v.vout,
          txId: v.txid,
          txHex: v.txhex,
          value: v.value,
          privateKey: privateKeyHex,
          address: txObject.from,
          addressType: this.resolveAddressType(txObject.from, wlt.CURRENCIES.Bitcoin.network)
        }))

        //todo include min sufficient of inputs for sending amount only
        let inputsSum = inputs.reduce((v, {value}) => v + parseInt(value), 0)
        let changeAmount = inputsSum - txObject.amount - (txObject.txnFeeSatoshi || (uncheckedSerialize ? 0 : txObject.txnFeeSatoshi))

        if (changeAmount < 0) {
          reject('amount with fee is too big')
          return
        }

        if (isNaN(changeAmount) || changeAmount > inputsSum) {
          reject(`wrong value among 1) inputs sum ${inputsSum}; 2) amount ${txObject.amount}; 3) fee ${txObject.fee}`)
          return
        }

        let outputs = [
          {
            address: txObject.to,
            value: txObject.amount
          }
        ]

        if (changeAmount > 0) {
          outputs.push({
            address: txObject.changeAddress,
            value: changeAmount
          })
        }

        resolve(heat.heatAppLib.BITCOIN_CREATE_1_TO_1_TRANSACTION({inputs, outputs, network: wlt.CURRENCIES.Bitcoin.network}) + "")
      }

      if (utxoData) {
        createTx(JSON.parse(utxoData))
      } else {
        btcBlockExplorerService.getUtxos(txObject.from).then(
            utxos => createTx(utxos),
            err => {
              reject(err)
            }
        ).catch(reason => reject(reason))
      }
    })
  }

  sendBitcoins(rawTx: string): Promise<{ txId: string, message: string }> {
    return new Promise((resolve, reject) => {
      let btcBlockExplorerService: BtcBlockExplorerService = heat.$inject.get('btcBlockExplorerService')
      btcBlockExplorerService.broadcast(rawTx).then(
        txId => {
          resolve({txId : txId.txId, message: ''})
        },
        error => {
          reject(error)
        }
      )
    })
  }

  generateBitcoinAddress(secret: string, index: Number = 0) {
    if (this.bip39.validateMnemonic(secret)) {
      let seedHex = this.bip39.mnemonicToSeedHex(secret)
      let HDPrivateKey = this.bitcore.HDPrivateKey
      let hdPrivateKey = HDPrivateKey.fromSeed(seedHex, wlt.CURRENCIES.Bitcoin.network == 'bitcoin' ? 'mainnet' : wlt.CURRENCIES.Bitcoin.network)
      let derived = hdPrivateKey.derive(BitcoreService.BIP44_PATH() + index)
      let address = derived.privateKey.toAddress()
      let privateKey = derived.privateKey.toWIF()
      return {
        address: address.toString(),
        privateKey: privateKey.toString()
      }
    } else {
      let privateKey = this.bitcore.PrivateKey(secret)
      let address = privateKey.toAddress()
      return {
        address: address.toString(),
        privateKey: privateKey.toWIF()
      }
    }
  }

  generateSegwitBitcoinAddress(secret: string, index: Number = 0) {
    let privateKey: string
    let privateKeyWif: string
    if (this.bip39.validateMnemonic(secret)) {
      const paths = [{path: BitcoreService.BIP44_PATH() + index, includeWif: true}]
      const seedHex = heat.heatAppLib.WALLET_MNEMONIC_TO_SEED_SYNC({mnemonic: secret})
      const keyPair = heat.heatAppLib.WALLET_DERIVE_KEY_PAIRS({seedHex, paths})[0]
      privateKey = keyPair.privateKey
      privateKeyWif = keyPair.wif
    } else {
      let pk = this.bitcore.PrivateKey.fromWIF(secret)
      privateKey = pk.toString()
      privateKeyWif = pk.toWIF()
    }
    const publicKey = heat.heatAppLib.BITCOIN_GET_PUBLICKEY_FROM_PRIVATEKEY({privateKey: privateKey, network: wlt.CURRENCIES.Bitcoin.network })
    let a = heat.heatAppLib.BITCOIN_PUBLICKEY_TO_P2WPKH_IN_P2SH({publicKey: publicKey, network: wlt.CURRENCIES.Bitcoin.network})
    return {
      address: a,
      privateKey: privateKeyWif
    }
  }

  resolveAddressType(address: string, network = 'bitcoin') {
    const prefixes = {
      bitcoin: {
        '1': 'p2pkh',
        '3': 'p2wpkh_in_p2sh',
        'bc1q': 'p2wpkh',
        'bc1p': 'p2tr'
      },
      testnet: {
        'm': 'p2pkh',
        'n': 'p2pkh',
        '2': 'p2wpkh_in_p2sh',
        'tb1': 'p2wpkh'
      }
    }
    let p = prefixes[network]
    for (const [key, value] of Object.entries(p)) {
      if (address.startsWith(key)) return value
    }
  }

  signBitcoinMessage(address: string, message: string, privateKey: string) {
    let privateKeyHex = this.bitcore.PrivateKey.fromWIF(privateKey).toString()
    let addressType = this.resolveAddressType(address)
    let signatureHex = heat.heatAppLib.BITCOIN_BIP137_SIGN({
      privateKeyHex: privateKeyHex,
      network: wlt.CURRENCIES.Bitcoin.network,
      addressType: addressType,
      message: message,
      extraEntropyHex: "00000000000000000000000000000000000000000000000000000000000007ba",
    })
    const signatureBase64 = this.$window.heatlibs.safeBuffer.Buffer.from(signatureHex, "hex").toString("base64")
    //const signatureBase64 = Buffer.from(signatureHex, "hex").toString("base64")
    return signatureBase64
  }

  privateKeyToWIF(hexOrWIF: string) {
    let pk
    try {
      pk = new this.bitcore.PrivateKey(hexOrWIF)
    } catch (e) {
      pk = this.bitcore.PrivateKey.fromWIF(hexOrWIF)
    }
    return pk?.toWIF()
  }

}
