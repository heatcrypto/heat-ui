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

  /* BIP44,BIP49 key index */
  index: number;

  /* Balance is full ETH */
  balance: string;

  /* Indicates if address is in use, two indexes at 0 balance indicates key not in use
      (not completely accurate since a user can use an address which has a zero balance) */
  inUse: boolean;

  created?: boolean;

  accountId?: string;

  /* Allow user to soft delete address from wallet */
  isDeleted?: boolean;

  /* ERC20 token balances */
  tokensBalances?: Array<{
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    address: string;
    rawBalance?: string;
  }>
}
declare type WalletAddresses = {
  addresses: Array<WalletAddress>
}

@Service('lightwalletService')
@Inject('web3', 'user', 'settings', '$rootScope', '$window', 'storage')
class LightwalletService {

  //public wallet: WalletAddresses
  static readonly BIP44 = "m/44'/60'/0'/0";
  static readonly BIP4461 = "m/44'/61'/0'/0/0";
  private lightwallet;
  private ethBlockExplorerService: EthBlockExplorerService

  constructor(private web3Service: Web3Service,
    private userService: UserService,
    private settingsService: SettingsService,
    private $rootScope: angular.IRootScopeService,
    private $window: angular.IWindowService,
    storage: StorageService) {
    this.lightwallet = $window.heatlibs.lightwallet;
    this.ethBlockExplorerService = heat.$inject.get('ethBlockExplorerService')
  }

  generateRandomSeed() {
    return this.lightwallet.keystore.generateRandomSeed();
  }

  validSeed(seed) {
    try {
      return this.lightwallet.keystore.isSeedValid(seed)
    } catch (e) {
      console.error("Error on seed validation: " + e)
    }
    return false
  }

  validPrivateKey(privKey) {
    return utils.isHex(privKey) && privKey.length == 64
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(walletAddresses: WalletAddresses, seedOrPrivateKey: string, reset?: boolean): Promise<WalletAddresses> {
    return new Promise((resolve, reject) => {
      let heatAddress = heat.crypto.getAccountId(seedOrPrivateKey)
      if (!reset && walletAddresses) {
        resolve(walletAddresses)
      } else {
        let promise: Promise<WalletAddresses>
        if (this.validSeed(seedOrPrivateKey)) {
          promise = this.createEtherAddresses(seedOrPrivateKey, '')
        } else if (this.validPrivateKey(seedOrPrivateKey)) {
          promise = this.createEtherAddressesFromPrivateKey(seedOrPrivateKey, '')
        } else {
          reject("Invalid seed or private key")
        }
        promise.then(walletAddresses => {
          let encryptedAddresses = heat.crypto.encryptMessage(JSON.stringify(walletAddresses), heatAddress, seedOrPrivateKey)
          return db.putCryptoAddresses(heatAddress, 'ETH', encryptedAddresses)
              .then(recordId => resolve(walletAddresses))
        }).catch(reject)
      }
    })
  }

  loadAddressInfo(walletAddress: WalletAddress) {
    return this.ethBlockExplorerService.getAddressInfo(walletAddress.address, true).then(info => {
      walletAddress.balance = info.ETH.balance + ""
      walletAddress.tokensBalances = []
      walletAddress.inUse = (info.txs || info.countTxs) > 0
      if (info.tokens) {
        info.tokens.forEach(token => {
          let tokenInfo = this.ethBlockExplorerService.tokenInfoCache[token.tokenInfo.address]
          let decimals = tokenInfo ? +(tokenInfo.decimals || 0) : 8
          let amount = token.balance ? new Big(token.balance + "").toFixed() : "0"
          walletAddress.tokensBalances.push({
            symbol: tokenInfo ? tokenInfo.symbol : '',
            name: tokenInfo ? tokenInfo.name : '',
            decimals: decimals,
            balance: utils.formatERC20TokenAmount(amount, decimals),
            rawBalance: token.rawBalance,
            address: token.tokenInfo.address
          })
        })
      }
      return walletAddress
    })
  }

  refreshBalances(walletAddresses: WalletAddresses, ethCurrencyAddressLoading: wlt.CurrencyAddressLoading) {
    /* list all addresses in bip44 order */
    walletAddresses.addresses.forEach(value => value.balance = "")  // balances are unknown until load from blockchain
    let actualWalletAddresses = walletAddresses.addresses.filter(a => !a.isDeleted)
    let emptyAddressCounter = 0
    let self = this

    let processNext = () => {
      return new Promise((resolve, reject) => {

        /* get the first element from the list */
        let walletAddress = actualWalletAddresses.shift()
        if (!walletAddress) {
          resolve(false)
          return
        }

        ethCurrencyAddressLoading.address = walletAddress.address

        /* look up its data on ethBlockExplorerService */
        self.ethBlockExplorerService.refresh().then(() => {
          self.loadAddressInfo(walletAddress).then((walletAddress: WalletAddress) => {
            if (!walletAddress) {
              resolve(false)
              return
            }
            emptyAddressCounter++
            if (walletAddress.inUse) emptyAddressCounter = 0  // reset counter since need extra unused addresses

            // if there are 2 zero addresses in a row, then we do not load the addresses further
            if (emptyAddressCounter >= 2) {
              resolve(false)
              return
            }
            resolve(true)
          }, (reason) => {
            console.error(reason)
            reject(false)
          })
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
          } else {
            resolve()
          }
        }
      )
    }

    return new Promise((resolve, reject) => {
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

  createEtherAddresses(seed: string, password: string, derivationPath = LightwalletService.BIP44): Promise<WalletAddresses> {
    let that = this;
    return new Promise((resolve, reject) => {
      try {
        this.lightwallet.keystore.createVault({
          password: password,
          seedPhrase: seed,
          hdPathString: derivationPath
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

  createEtherAddressesFromPrivateKey(privkeyHex: string, password: string): Promise<WalletAddresses> {
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
                wallet.addresses[i] = { address: walletAddress, privateKey, index: i, balance: "", inUse: false }
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

  signEthereumMessage(address: string, message: string, privateKey: string) {
    let signatureHex = heat.heatAppLib.ETHEREUM_SIGN_MESSAGE_SYNC({ privateKey, message })
    return signatureHex
  }


}
