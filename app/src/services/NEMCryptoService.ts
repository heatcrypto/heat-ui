@Service('nemCryptoService')
@Inject('$window', 'user')
class NEMCryptoService {

  private nem;
  private network;

  constructor(private $window: angular.IWindowService,
    private user: UserService) {
    this.nem = $window.heatlibs.nem.default;
    this.network = this.nem.model.network.data.testnet.id;
  }

  /* Sets the seed to this wallet */
  unlock(seedOrPrivateKey: any): Promise<WalletType> {
    return new Promise((resolve, reject) => {
      let walletType = { addresses: [] }
      var privateKey = this.nem.crypto.helpers.derivePassSha(seedOrPrivateKey, 6000).priv;
      var wallet = this.nem.model.wallet.createBrain('NEMWallet', seedOrPrivateKey, this.network);

      walletType.addresses[0] = { address: wallet.accounts[0].address, privateKey: privateKey}
      resolve(walletType);
    });
  }

  getSerializedObject = (common, transactionEntity) => {
    var kp = this.nem.crypto.keyPair.create(common.privateKey);
    var serialized = this.nem.utils.serialization.serializeTransaction(transactionEntity);
    var signature = kp.sign(serialized);

    var result = {
      'data': this.nem.utils.convert.ua2hex(serialized),
      'signature': signature.toString()
    };
    return JSON.stringify(result)
  }

  sendTx = (tx, node) => {
    let endpoint = this.nem.model.objects.create("endpoint")(node, this.nem.model.nodes.defaultPort);
    return this.nem.com.requests.transaction.announce(endpoint, tx)
  }

  getAddressFromPublicKey = (publicKey) => {
    return this.nem.model.address.toAddress(publicKey, this.network)
  }

  getTransaction = (hash) => {
    return this.nem.com.requests.transaction(hash)
  }

  getTransferTxObject = () => {
    return this.nem.model.objects.get("transferTransaction");
  }

  getCommonObject = () => {
    return this.nem.model.objects.get('common')
  }

  getPrepareTxObject = (common, transferTransaction) => {
    return this.nem.model.transactions.prepare("transferTransaction")(common, transferTransaction, this.network)
  }

  refreshAdressBalances(wallet: WalletType) {
    let address = wallet.addresses[0].address;
    return new Promise((resolve, reject) => {
      let NemBlockExplorerService: NemBlockExplorerService = heat.$inject.get('nemBlockExplorerService')
      NemBlockExplorerService.getTransactions(address).then(transactions => {
        if (transactions.length != 0) {
          NemBlockExplorerService.getAccount(address).then(data => {
            wallet.addresses[0].balance = new Big(utils.convertToQNTf(data.account.balance.toString(), 6)).toFixed(6);
            wallet.addresses[0].inUse = true;
            resolve(true)
          })
        } else {
          resolve(false)
        }
      })
    })
  }
}