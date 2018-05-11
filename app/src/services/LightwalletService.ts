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
declare var lightwallet: any;
declare var HookedWeb3Provider: any;
declare var Web3: any;
declare type WalletType = {
  addresses:Array<{
    /* Ethereum address */
    address:string,

    /* ks.exportPrivateKey */
    privateKey:string,

    /* BIP44 key index */
    index: number,

    /* Balance is full ETH */
    balance:string,

    /* Indicates if address is in use, two indexes at 0 balance indicates key not in use
        (not completely accurate since a user can use an address which has a zero balance) */
    inUse:boolean
  }>
}
@Service('lightwalletService')
@Inject('web3', 'user', 'settings', '$rootScope','etherscanService')
class LightwalletService {

  public wallet: WalletType
  static readonly BIP44 = "m/44'/60'/0'/0";

  constructor(private web3Service: Web3Service,
              private userService: UserService,
              private settingsService: SettingsService,
              private $rootScope: angular.IRootScopeService,
              private etherscanService: EtherscanService) {
  }

  generateRandomSeed() {
    return lightwallet.keystore.generateRandomSeed();
  }

  validSeed(seed) {
    return lightwallet.keystore.isSeedValid(seed)
  }

  /* Sets the 12 word seed to this wallet, note that seeds have to be bip44 compatible */
  unlock(seed: string, password?: string): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      if (this.validSeed(seed)) {
        this.getEtherWallet(seed, password||"").then(wallet => {
          this.wallet = wallet
          console.log('wallet',wallet)
          resolve(this.wallet)
        }, () => {
          resolve()
        })
      }
    })
  }

  refreshAdressBalances() {
    return new Promise((resolve, reject) => {
      this.etherscanService.getEtherBalances(this.wallet.addresses.map(a => a.address)).then(balances => {
        balances.forEach(bal => {
          let entryInWallet = this.wallet.addresses.find(a => a.address == bal.address)
          if (entryInWallet) {
            entryInWallet.balance = bal.balance
          }
        })

        // now walk backwards marking all addresses that have no next address with a zero balance as unused bip44 addresses
        for (let i=this.wallet.addresses.length-1; i>=0; i--) {
          if (this.wallet.addresses[i].balance == "0") {
            this.wallet.addresses[i].inUse = false
          }
          else {
            this.wallet.addresses[i].inUse = true
            break
          }
        }
        resolve()
      }, reject)
    })
  }

  sendEther(from: string, to: string, value: any) {
   this.web3Service.sendEther(from, to, value);
  }

  getEtherWallet(seed: string, password: string): Promise<WalletType> {
    let that = this;
    return new Promise((resolve, reject) => {
      try {
        lightwallet.keystore.createVault({
          password: password,
          seedPhrase: seed,
          hdPathString: LightwalletService.BIP44

        }, (err, ks) => {
          if (err) {
            reject();
            return;
          }

          var web3Provider = new HookedWeb3Provider({
            host: this.settingsService.get(SettingsService.WEB3PROVIDER),
            transaction_signer: ks
          });
          this.web3Service.web3.setProvider(web3Provider);
          ks.passwordProvider = function (callback) {
            callback(null, password);
          }

          ks.keyFromPassword(password, function (err, pwDerivedKey) {
            let keyCount = 20
            ks.generateNewAddress(pwDerivedKey, keyCount);
            var addresses = ks.getAddresses();

            let wallet = {addresses: []}
            for (let i=0; i<keyCount; i++) {
              let walletAddress = addresses[i];
              let privateKey = ks.exportPrivateKey(walletAddress, pwDerivedKey);
              wallet.addresses[i] = { address:walletAddress, privateKey, index: i, balance:"0", inUse:true }
            }
            resolve(wallet);
          });
        })
      } catch (e) {
        reject()
      }
    })
  }
}