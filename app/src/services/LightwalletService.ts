/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
declare type WalletAddress = {
  /* Ethereum address */
  address: string;

  /* ks.exportPrivateKey */
  privateKey: string;

  /* BIP44 key index */
  index: number;

  /* Balance is full ETH */
  balance: string;

  /* Indicates if address is in use, two indexes at 0 balance indicates key not in use
      (not completely accurate since a user can use an address which has a zero balance) */
  inUse: boolean;

  accountId: string;

  /* ERC20 token balances */
  tokensBalances: Array<{
    symbol: string;

    name: string;

    decimals: number;

    balance: string;

    address: string;
  }>
}
declare type WalletType = {
  addresses: Array<WalletAddress>
}

@Service('lightwalletService')
@Inject('web3', 'user', 'settings', '$rootScope', 'ethplorer', '$window')
class LightwalletService {

  //public wallet: WalletType
  static readonly BIP44 = "m/44'/60'/0'/0";
  private lightwallet;

  constructor(private web3Service: Web3Service,
    private userService: UserService,
    private settingsService: SettingsService,
    private $rootScope: angular.IRootScopeService,
    private ethplorer: EthplorerService,
    private $window: angular.IWindowService,) {
      this.lightwallet = $window.heatlibs.lightwallet;
  }

  generateRandomSeed() {
    return this.lightwallet.keystore.generateRandomSeed();
  }

  validSeed(seed) {
    return this.lightwallet.keystore.isSeedValid(seed)
  }

  validPrivateKey(privKey) {
    return utils.isHex(privKey) && privKey.length > 32
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seedOrPrivateKey: string, password?: string): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let promise:Promise<WalletType>;
      if (this.validSeed(seedOrPrivateKey)) {
        promise = this.getEtherWallet(seedOrPrivateKey, password || "")
      }
      else if (this.validPrivateKey(seedOrPrivateKey)) {
        promise = this.getEtherWalletFromPrivateKey(seedOrPrivateKey, password || "")
      }
      else {
        reject()
      }
      promise.then(wallet => {
        // console.log('wallet', wallet)
        resolve(wallet)
      }).catch(() => {
        reject()
      })
    });
  }

  refreshAdressBalances(wallet:WalletType) {
    /* list all addresses in bip44 order */
    let addresses = wallet.addresses.map(a => a.address)

    function processNext() {
      return new Promise((resolve, reject) => {

        /* get the first element from the list */
        let address = addresses[0]
        addresses.shift()

        /* look up its data on ethplorer */
        let ethplorer: EthplorerService = heat.$inject.get('ethplorer')
        ethplorer.getAddressInfo(address).then(info => {

          /* lookup the 'real' WalletAddress */
          let walletAddress = wallet.addresses.find(x => x.address == address)
          if (!walletAddress)
            return

          walletAddress.inUse = info.countTxs!=0
          if (!walletAddress.inUse) {
            resolve(false)
            return
          }

          walletAddress.balance = info.ETH.balance+""
          walletAddress.tokensBalances = []

          if (info.tokens) {
            info.tokens.forEach(token => {
              let tokenInfo = ethplorer.tokenInfoCache[token.tokenInfo.address]
              let decimals = tokenInfo?tokenInfo.decimals:8
              let amount = token.balance ? new Big(token.balance+"").toFixed() : "0"
              walletAddress.tokensBalances.push({
                symbol: tokenInfo?tokenInfo.symbol:'',
                name: tokenInfo?tokenInfo.name:'',
                decimals: decimals,
                balance: utils.formatQNT(amount,decimals),
                address: token.tokenInfo.address
              })
            })
          }
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

  sendEther(from: string, to: string, value: any) {
    this.web3Service.sendEther(from, to, value);
  }

  /*
  // https://github.com/ConsenSys/eth-lightwallet/blob/master/lib/keystore.js#L184
  KeyStore._computeAddressFromPrivKey = function (privKey) {
    return address
  }

  // what we need is this

  KeyStore.prototype.importPrivateKey = function(privatekey,pwDerivedKey) {}

  */

  getEtherWallet(seed: string, password: string): Promise<WalletType> {
    let that = this;
    return new Promise((resolve, reject) => {
      try {
        this.lightwallet.keystore.createVault({
          password: password,
          seedPhrase: seed,
          hdPathString: LightwalletService.BIP44
        }, (err, ks) => {
          if (err) {
            reject();
            return;
          }

          var HookedWeb3Provider = this.$window.heatlibs.HookedWeb3Provider;
          var web3Provider = new HookedWeb3Provider({
            host: this.settingsService.get(SettingsService.WEB3PROVIDER),
            transaction_signer: ks
          });
          this.web3Service.web3.setProvider(web3Provider);
          ks.passwordProvider = function (callback) {
            callback(null, password);
          }

          ks.keyFromPassword(password, function (err, pwDerivedKey) {
            if (err) {
              reject()
              return
            }

            try {
              let keyCount = 20
              ks.generateNewAddress(pwDerivedKey, keyCount);
              var addresses = ks.getAddresses();

              let wallet = { addresses: [] }
              for (let i = 0; i < keyCount; i++) {
                let walletAddress = addresses[i];
                let privateKey = ks.exportPrivateKey(walletAddress, pwDerivedKey);
                wallet.addresses[i] = { address: walletAddress, privateKey, index: i, balance: "0", inUse: false }
              }
              resolve(wallet);
            } catch (e) {
              console.error(e)
              reject()
            }
          });
        })
      } catch (e) {
        console.error(e)
        reject()
      }
    })
  }

  getEtherWalletFromPrivateKey(privkeyHex: string, password: string): Promise<WalletType> {
    let that = this;
    return new Promise((resolve, reject) => {
      try {
        this.lightwallet.keystore.createVault({
          password: password,
          // we use a random seed each time since lightwallet needs that
          seedPhrase: this.lightwallet.keystore.generateRandomSeed(),
          hdPathString: LightwalletService.BIP44
        }, (err, ks) => {
          if (err) {
            reject();
            return;
          }

          var HookedWeb3Provider = this.$window.heatlibs.HookedWeb3Provider;
          var web3Provider = new HookedWeb3Provider({
            host: this.settingsService.get(SettingsService.WEB3PROVIDER),
            transaction_signer: ks
          });
          this.web3Service.web3.setProvider(web3Provider);
          ks.passwordProvider = function (callback) {
            callback(null, password);
          }

          ks.keyFromPassword(password, function (err, pwDerivedKey) {
            if (err) {
              reject()
              return
            }

            try {
              var encPrivKey = this.heatlibs.lightwallet.keystore._encryptKey(privkeyHex, pwDerivedKey);
              var keyObj = {
                privKey: privkeyHex,
                encPrivKey: encPrivKey
              }
              var address = this.heatlibs.lightwallet.keystore._computeAddressFromPrivKey(keyObj.privKey);
              ks.encPrivKeys[address] = keyObj.encPrivKey;
              ks.addresses.push(address);

              var addresses = ks.getAddresses();
              let wallet = { addresses: [] }
              for (let i = 0; i < addresses.length; i++) {
                let walletAddress = addresses[i];
                let privateKey = ks.exportPrivateKey(walletAddress, pwDerivedKey);
                wallet.addresses[i] = { address: walletAddress, privateKey, index: i, balance: "0", inUse: false }
              }
              resolve(wallet);

            } catch (e) {
              console.error(e)
              reject()
            }
          });
        })
      } catch (e) {
        console.error(e)
        reject()
      }
    })
  }

}