@Service('ardorBlockExplorerService')
@Inject('$q', 'http')
class ArdorBlockExplorerService {
  private url: string;

  constructor(
    private $q: angular.IQService,
    private http: HttpService) {
    this.setUrl()
  }

  public setUrl(url = 'http://localhost:27876/') {
    this.url = url;
  }

  public getTransactions = (account, firstIndex, lastIndex) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBlockchainTransactions&account=${account}&firstIndex=${firstIndex}&lastIndex=${lastIndex}&chain=1`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret));
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
    this.http.get(`${this.url}nxt?requestType=getBlockchainTransactions&account=${account}&lastIndex=-1&chain=1`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret));
      if (data.transactions)
        deferred.resolve(data.transactions.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public sendArdr = (txObject) => {
    let deferred = this.$q.defer<any>();
    this.http.post(this.url + txObject, {}).then(ret => {
      let userService: UserService = heat.$inject.get('user')
      let data = JSON.parse(JSON.stringify(ret))
      if(data.errorDescription) {
        deferred.reject(data.errorDescription)
      }
      // deferred.resolve({txId: data.transactionJSON.transaction, fullHash: data.fullHash})
      let attachment = JSON.stringify(data.transactionJSON.attachment);
      var signature = heat.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(userService.secretPhrase))
      var payload = data.unsignedTransactionBytes.substr(0, 192) + signature + data.unsignedTransactionBytes.substr(320);
      this.http.post(`${this.url}nxt?requestType=broadcastTransaction&transactionBytes=${payload}&prunableAttachmentJSON=${attachment}`, {}).then(ret => {
        let data = JSON.parse(JSON.stringify(ret))
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

  public getTransactionStatus = (fullHash) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getTransaction&fullHash=${fullHash}&chain=1`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret))
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
      let data = JSON.parse(JSON.stringify(ret))
      if (data.accountAssets)
        deferred.resolve(data.accountAssets)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getBalance = (account: string) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBalance&account=${account}&chain=1`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret))
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
      let data = JSON.parse(JSON.stringify(ret))
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
      let data = JSON.parse(JSON.stringify(ret))
      if (data.name)
        deferred.resolve(data)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }
}