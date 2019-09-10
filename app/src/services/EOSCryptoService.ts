@Service('eosCryptoService')
@Inject('$window', 'storage', '$rootScope')
class EOSCryptoService {

  static readonly BIP44 = "m/44'/194'/0'/0/";
  private hdkey;
  private bip39;
  private wif;
  private ecc;
  private safeBuffer;
  private store: Store;

  constructor($window: angular.IWindowService,
    storage: StorageService,
    private $rootScope: angular.IRootScopeService) {
    this.hdkey = $window.heatlibs.hdkey;
    this.bip39 = $window.heatlibs.bip39;
    this.wif = $window.heatlibs.wif;
    this.ecc = $window.heatlibs.ecc;
    this.safeBuffer = $window.heatlibs.safeBuffer;
    this.store = storage.namespace('wallet-address', $rootScope, true);
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey);
      let walletAddresses = this.store.get(`EOS-${heatAddress}`)
      if (walletAddresses) {
        resolve(walletAddresses);
      } else if (this.bip39.validateMnemonic(seedOrPrivateKey)) {
        let walletType = this.getNWalletsFromMnemonics(seedOrPrivateKey, 20)
        this.store.put(`EOS-${heatAddress}`, walletType);
        resolve(walletType)
      }
      else {
        reject();
      }
    });
  }

  getNWalletsFromMnemonics(mnemonic: string, keyCount: number) {
    let walletType = { addresses: [] }
    for (let i = 0; i < keyCount; i++) {
      let wallet = this.getWallet(mnemonic, i)
      // publicKey is not an address in EOS.
      walletType.addresses[i] = { address: wallet.publicKey, privateKey: wallet.privateKey, index: i, balance: "0", inUse: false }
    }
    return walletType;
  }

  refreshAdressBalances(wallet: WalletType) {
    /* list all addresses in bip44 order */
    let addresses = wallet.addresses.map(a => a.address)
    let eosAccounts = [];

    function processNext() {
      return new Promise((resolve, reject) => {

        /* get the first element from the list */
        let address = addresses[0]
        addresses.shift()

        /* look up its data on eosBlockExplorerService */
        let eosBlockExplorerService: EosBlockExplorerService = heat.$inject.get('eosBlockExplorerService')
        eosBlockExplorerService.getPublicKeyAccounts(address).then(accounts => {
          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress)
            return

          accounts.forEach(account => {
            eosBlockExplorerService.getBalance(account).then(info => {
              eosAccounts.push({ balance: info, inUse: true, address: account, privateKey: walletAddress.privateKey })
              walletAddress.inUse = info !== undefined
              if (!walletAddress.inUse) {
                resolve(false)
                return
              }

              walletAddress.balance = info + ""
              resolve(true)
            }, () => {
              resolve(false)
            })
          });
        }).catch(() => {
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
            wallet.addresses = eosAccounts;
            resolve()
          }
        }
      )
    }

    return new Promise(resolve => {
      recurseToNext(resolve)
    })
  }

  getWallet(mnemonic: string, index: Number = 0) {
    const seed = this.bip39.mnemonicToSeedHex(mnemonic)
    const master = this.hdkey.fromMasterSeed(this.safeBuffer.Buffer.from(seed, 'hex'))
    const node = master.derive(`${EOSCryptoService.BIP44}${index}`)
    const publicKey = this.ecc.PublicKey(node._publicKey).toString()
    const privateKey = this.wif.encode(128, node._privateKey, false)
    return {
      privateKey,
      publicKey
    }
  }
}