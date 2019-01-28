@Service('nxtBlockExplorerService')
@Inject('$q', 'http')
class NxtBlockExplorerService {
  private url: string;

  constructor(
    private $q: angular.IQService,
    private http: HttpService) {
    this.setUrl()
  }

  public setUrl(url = 'http://localhost:7876/') {
    this.url = url;
  }

  public getBlockchainStatus = () => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBlockchainStatus`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data) {
        deferred.resolve(data)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }

  public getTransactions = (account, firstIndex, lastIndex) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBlockchainTransactions&account=${account}&firstIndex=${firstIndex}&lastIndex=${lastIndex}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data.transactions) {
        deferred.resolve(data.transactions)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }

  public getTransactionsCount = (account) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBlockchainTransactions&account=${account}&lastIndex=-1`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data.transactions)
        deferred.resolve(data.transactions.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAccount = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getAccount&account=${address}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.unconfirmedBalanceNQT)
        deferred.resolve(data)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public sendNxt = (txObject) => {
    let deferred = this.$q.defer<any>();
    this.http.post(this.url + txObject, {}).then(ret => {
      let userService: UserService = heat.$inject.get('user')
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if(data.errorDescription) {
        deferred.reject(data.errorDescription)
      }
      var signature = heat.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(userService.secretPhrase))
      var payload = data.unsignedTransactionBytes.substr(0, 192) + signature + data.unsignedTransactionBytes.substr(320);
        this.http.post(`${this.url}nxt?requestType=broadcastTransaction&transactionBytes=${payload}`, {}).then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
        if(data.errorDescription) {
          deferred.reject(data.errorDescription)
        }
        deferred.resolve({txId: data.transaction})
      })
    }, err => {
      deferred.reject(err.errorDescription)
    })
    return deferred.promise;
  }

  public getTransactionStatus = (transactionId) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getTransaction&transaction=${transactionId}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (!data.errorDescription)
        deferred.resolve(data)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAccountAssets = (tx) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getAccountAssets&account=${tx}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.accountAssets)
        deferred.resolve(data.accountAssets)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getBalance = (account: string) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBalance&account=${account}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.unconfirmedBalanceNQT)
        deferred.resolve(data.unconfirmedBalanceNQT)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getPublicKeyFromAddress = (account: string) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getAccountPublicKey&account=${account}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.publicKey)
        deferred.resolve(data.publicKey)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAssetInfo = (asset: string) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getAsset&asset=${asset}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.name)
        deferred.resolve(data)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }
}
