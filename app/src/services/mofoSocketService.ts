@Service('mofoSocketService')
@Inject('$q', '$timeout', '$interval', '$rootScope')
class MofoSocketService {
  private socket: any;;
  private url: string;

  private prototype = {
    installMethods: [
      'callAPIFunction',
      'getAccountAssets',
      'getAccountCurrencies',
      'getActivity',
      'getRecentTransactions',
      'getComments',
      'getCommentCount',
      'getAccountPosts',
      'getAssetPosts',
      'getAccounts',
      'getAccount',
      'getAsset',
      'getForgingStats',
      'getActivityStatistics',
      'getAskOrder',
      'getBidOrder',
      'getAssetChartData',
      'getAssetOrders',
      'getAssetTrades',
      'getMyOpenOrders',
      'getBlockchainState',
      'getAccountLessors',
      'search',
      'getAssetPrivateAccounts'
    ]
  };

  constructor(
    private $q: angular.IQService,
    private $timeout: angular.ITimeoutService,
    private $interval: angular.IIntervalService,
    private $rootScope: angular.IScope) {
  }

  mofoSocket = (url = 'wss://cloud.mofowallet.org:7986/ws/') => {
    if(this.url == url && this.socket !== undefined) {
      return
    }
    this.createSocket(url)
  }

  closeSocket = () => {
    this.socket.close();
  }

  createSocket = (url) => {
    if(this.socket) {
      // if socket already exists then close the socket
    }
    this.url = url;
    this.socket = new WebSocket(url);
    this.socket.onclose = (evt) => { this.onclose(evt) };
    this.socket.onopen = (evt) => { this.onopen(evt) };
    this.socket.onerror = (evt) => { this.onmessage(evt) };
    this.socket.onmessage = (evt) => { this.onmessage(evt) };
  }


  _send = (argv) => {
    if (this.socket && this.socket.readyState == 1) {
      var message = JSON.stringify(argv);
      this.socket.send(message);
    }
  }

  onopen = (event) => {
    console.log('WEBSOCKET - onopen ' + new Date(), { socket: this.socket, event: event })
  }

  onclose = (event) => {
    console.log('WEBSOCKET - onclose ' + new Date(), { socket: this.socket, event: event })
  }

  onerror = (event) => {
    console.log('WEBSOCKET - onerror REMOVE BAD URL [' + this.url + ']' + new Date(), { event: event });
  }

  onmessage = (event) => {
    var message = event.data;

    if (message == "pong" || !message) { return }
    try {
      var data = JSON.parse(message);
    }
    catch (e) {
      console.log('WEBSOCKET - JSON parse error', { socket: this.socket, event: event })
      return;
    }
    if (!Array.isArray(data)) {
      throw new Error('WEBSOCKET - Expected an array');
    }

    var op = data[0];
    if (op == "response") {
      this.$rootScope.$broadcast(data[1], data[2])
    }
    else {
      throw new Error('WEBSOCKET - Unsupported operation');
    }
  }

  public getTransactions = (account, timestamp = 0) => {
    let deferred = this.$q.defer<any>();
    this._send(['call', 'getTransactions', 'getActivity', { account }])
    this.$rootScope.$on('getTransactions', (event, opts) => {
      if(opts.transactions)
        deferred.resolve(opts.transactions)
      else
      deferred.reject()
    });
    return deferred.promise;
  }

  public getTransactionsCount = (account) => {
    let deferred = this.$q.defer<number>();
    this._send(['call', 'getTransactionsCount', 'getActivity', { account }])
    this.$rootScope.$on('getTransactionsCount', (event, opts) => {
      // implementation here
      deferred.resolve(15)
    });
    return deferred.promise;
  }

  public getAccount = (address: string) => {
    let deferred = this.$q.defer<any>();
    this._send(['call', 'getFIMKAccount', 'getAccount', { account: address }])
    this.$rootScope.$on('getFIMKAccount', (event, opts) => {
      if (opts.unconfirmedBalanceNQT) {
        let balance = parseInt(opts.unconfirmedBalanceNQT) / 100000000;
        let formattedBalance = utils.commaFormat(new Big(balance + "").toFixed(8))
        deferred.resolve(formattedBalance)
      } else if(opts.errorDescription == "Unknown account") {
        deferred.resolve("0.00000000")
      } else {
        deferred.reject(opts.errorDescription)
      }
    });
    return deferred.promise;
  }

  public sendFim = (txObject) => {
    let deferred = this.$q.defer<any>();
    this._send(['call', 'sendMoney', 'callAPIFunction', txObject])
    this.$rootScope.$on('sendMoney', (event, opts) => {
      if(!opts.unsignedTransactionBytes) {
        deferred.reject(opts.errorDescription)
      }
      let userService: UserService = heat.$inject.get('user')
      var signature = heat.crypto.signBytes(opts.unsignedTransactionBytes, converters.stringToHexString(userService.secretPhrase))
      var payload = opts.unsignedTransactionBytes.substr(0, 192) + signature + opts.unsignedTransactionBytes.substr(320);
      this._send(['call', 'broadcastTransaction', 'callAPIFunction', { requestType: 'broadcastTransaction', transactionBytes: payload }])
      this.$rootScope.$on('broadcastTransaction', (event, opts) => {
        if (opts.errorCode) {
          deferred.reject(opts.errorDescription)
        }
        else {
          deferred.resolve({ txId: opts.transaction })
        }
      });
    });
    return deferred.promise;
  }

  public getRecentTx = (account) => {
    let deferred = this.$q.defer<any>();
    this._send(['call', 'getRecentTransactions', 'getRecentTransactions', { accounts: [account] }])
    this.$rootScope.$on('getRecentTransactions', (event, opts) => {
      if (!opts.errorCode) {
        deferred.resolve(opts);
      } else {
        deferred.reject(opts.error)
      }
    });
    return deferred.promise;
  }

  public getAccountAssets = (account) => {
    let deferred = this.$q.defer<any>();
    this._send(['call', 'getAccountAssets', 'callAPIFunction', {requestType:'getAccountAssets',account:account}])
    this.$rootScope.$on('getAccountAssets', (event, opts) => {
      if (!opts.errorCode) {
        deferred.resolve(opts.accountAssets);
      } else {
        deferred.reject(opts.error)
      }
    });
    return deferred.promise;
  }
}