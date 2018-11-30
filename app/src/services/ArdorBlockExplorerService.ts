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
      if (data.errorDescription) {
        deferred.reject(data.errorDescription)
      }
      // deferred.resolve({txId: data.transactionJSON.transaction, fullHash: data.fullHash})
      let attachment = JSON.stringify(data.transactionJSON.attachment);
      var signature = heat.crypto.signBytes(data.unsignedTransactionBytes, converters.stringToHexString(userService.secretPhrase))
      var payload = data.unsignedTransactionBytes.substr(0, 192) + signature + data.unsignedTransactionBytes.substr(320);
      this.http.post(`${this.url}nxt?requestType=broadcastTransaction&transactionBytes=${payload}&prunableAttachmentJSON=${attachment}`, {}).then(ret => {
        let data = JSON.parse(JSON.stringify(ret))
        if (data.errorDescription) {
          deferred.reject(data.errorDescription)
        }
        deferred.resolve({ txId: data.transaction })
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

  public getBalance = (account: string, chain: number = 1) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}nxt?requestType=getBalance&account=${account}&chain=${chain}`).then(ret => {
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


  public getTradesCount(ardorAsset: string, account?: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = account ? `${this.url}nxt?requestType=getTrades&chain=2&ardorAsset=${ardorAsset}&firstIndex=0&lastIndex=-1&account=${account}` : `${this.url}nxt?requestType=getTrades&chain=2&asset=${ardorAsset}&firstIndex=0&lastIndex=-1`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.trades)
        deferred.resolve(data.trades.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }


  public getTrades(ardorAsset: string, firstIndex: number, lastIndex: number, account?: string): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = account ? `${this.url}nxt?requestType=getTrades&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}&account=${account}` : `${this.url}nxt?requestType=getTrades&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.trades)
        deferred.resolve(data.trades)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAskOrdersCount(ardorAsset: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = `${this.url}nxt?requestType=getAskOrders&chain=2&asset=${ardorAsset}&firstIndex=0&lastIndex=-1`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.askOrders)
        deferred.resolve(data.askOrders.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAskOrders(ardorAsset: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = `${this.url}nxt?requestType=getAskOrders&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.askOrders)
        deferred.resolve(data.askOrders)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getBidOrdersCount(ardorAsset: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = `${this.url}nxt?requestType=getBidOrders&chain=2&asset=${ardorAsset}&firstIndex=0&lastIndex=-1`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.bidOrders)
        deferred.resolve(data.bidOrders.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getBidOrders(ardorAsset: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = `${this.url}nxt?requestType=getBidOrders&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.bidOrders)
        deferred.resolve(data.bidOrders)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getMyPendingOrders(account: string, ardorAsset: string, firstIndex: number, lastIndex: number) {
    let promises = [];
    let deferred = this.$q.defer<any>();
    promises.push(this.getAccountCurrentAskOrders(account, ardorAsset, firstIndex, lastIndex))
    promises.push(this.getAccountCurrentBidOrders(account, ardorAsset, firstIndex, lastIndex))

    let myPendingOrders = []
    Promise.all(promises).then(values => {
      values.forEach(value => {
        myPendingOrders = myPendingOrders.concat(value)
      })
      deferred.resolve(myPendingOrders)
    })
    return deferred.promise;
  }

  public getMyPendingOrdersCount(account: string, ardorAsset: string) {
    let promises = [];
    let deferred = this.$q.defer<number>();
    promises.push(this.getAccountCurrentAskOrdersCount(account, ardorAsset))
    promises.push(this.getAccountCurrentBidOrdersCount(account, ardorAsset))

    let myPendingOrdersCount = 0
    Promise.all(promises).then(values => {
      values.forEach(value => {
        myPendingOrdersCount += value
      })
      deferred.resolve(myPendingOrdersCount)
    })
    return deferred.promise;
  }

  public getAccountCurrentBidOrders(account: string, ardorAsset: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = `${this.url}nxt?requestType=getAccountCurrentBidOrders&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}&account=${account}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.bidOrders)
        deferred.resolve(data.bidOrders)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAccountCurrentBidOrdersCount(account: string, ardorAsset: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = `${this.url}nxt?requestType=getAccountCurrentBidOrders&chain=2&asset=${ardorAsset}&firstIndex=0&lastIndex=-1&account=${account}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.bidOrders)
        deferred.resolve(data.bidOrders.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAccountCurrentAskOrders(account: string, ardorAsset: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = `${this.url}nxt?requestType=getAccountCurrentAskOrders&chain=2&asset=${ardorAsset}&firstIndex=${firstIndex}&lastIndex=${lastIndex}&account=${account}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.askOrders)
        deferred.resolve(data.askOrders)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAccountCurrentAskOrdersCount(account: string, ardorAsset: string): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    let url = `${this.url}nxt?requestType=getAccountCurrentAskOrders&chain=2&asset=${ardorAsset}&firstIndex=0&lastIndex=-1&account=${account}`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.askOrders)
        deferred.resolve(data.askOrders.length)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getAllAssets(): angular.IPromise<any> {
    let deferred = this.$q.defer<any>();
    let url = `${this.url}nxt?requestType=getAllAssets&firstIndex=0&lastIndex=-1`
    this.http.get(url).then(response => {
      let data = angular.isString(response) ? JSON.parse(response) : response;
      if (data.assets)
        deferred.resolve(data.assets)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public sendTransactionWithSecret = (endpoint) => {
    let deferred = this.$q.defer<any>();
    this.http.post(`${this.url}nxt?requestType=${endpoint}`, {}).then(ret => {
      let data = JSON.parse(JSON.stringify(ret))
      if (data.errorDescription) {
        deferred.reject(data.errorDescription)
      }
      deferred.resolve({ txId: data.transaction })
    })
    return deferred.promise;
  }

}