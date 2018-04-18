declare var lightwallet: any;
declare var HookedWeb3Provider: any;
declare var Web3: any;
@Service('lightwalletService')
@Inject('web3', 'user', 'settings')
class LightwalletService {

  public secretSeed: string;
  public walletAddress: string;
  public privateKey: string;
  public web3;
  public password: string;
  static readonly BIP44 = "m/44'/60'/0'/0";

  constructor(private web3Service: Web3Service,
              private userService: UserService,
              private settingsService: SettingsService) {
  }

  generateRandomSeed() {
    return lightwallet.keystore.generateRandomSeed();
  }

  getUserEtherWallet(_seed: string) {
    let that = this;
    that.secretSeed = _seed;
    that.password = that.userService.secretPhrase;

    lightwallet.keystore.createVault({
      password: that.password,
      seedPhrase: _seed,
      hdPathString: LightwalletService.BIP44

    }, function (err, ks) {
      if (err) {return;}

      ks.keyFromPassword(that.password, function (err, pwDerivedKey) {
        ks.generateNewAddress(pwDerivedKey, 1);
        var addresses = ks.getAddresses();
        that.walletAddress = addresses[0];
        that.privateKey = ks.exportPrivateKey(that.walletAddress, pwDerivedKey);

        var web3Service = <Web3Service>heat.$inject.get('web3');
        var settingsService = <SettingsService> heat.$inject.get('settings');
        var web3Provider = new HookedWeb3Provider({
          host: settingsService.get(SettingsService.WEB3PROVIDER),
          transaction_signer: ks
        });
        web3Service.web3.setProvider(web3Provider);
        ks.passwordProvider = function (callback) {
          callback(null, that.password);
        }
        routeToWalletPage();
      });

    })

    function routeToWalletPage() {
      var $location = <angular.ILocationService>heat.$inject.get('$location');
      $location.path('ethwallet');
    }
  }

  sendEther(_to: string, _value: any) {
   this.web3Service.sendEther(this.walletAddress, _to, _value);
  }
}