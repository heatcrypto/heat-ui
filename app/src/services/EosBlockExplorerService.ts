@Service('eosBlockExplorerService')
@Inject('$q', '$http', '$interval', '$window')
class EosBlockExplorerService {
  private url: string = 'https://api.jungle.alohaeos.com/';
  private cachedGetCachedAccountBalance: Map<string, any> = new Map<string, any>();
  private bearerToken: string;
  private eosjs;
  private JsSignatureProvider;

  constructor(private $q: angular.IQService,
    private $http: angular.IHttpService,
    private $interval: angular.IIntervalService,
    private $window: angular.IWindowService) {
    this.eosjs = $window.heatlibs.eosjs;
    this.JsSignatureProvider = $window.heatlibs.JsSignatureProvider;
    this.checkAndIssueBearerToken();
  }

  public sendTransaction(privateKey: string, txData: any, meta: any): Promise<any> {
    const JsSignatureProvider = this.JsSignatureProvider.JsSignatureProvider;
    const Api = this.eosjs.Api;
    const JsonRpc = this.eosjs.JsonRpc;
    const rpc = new JsonRpc('https://jungle2.cryptolions.io', { fetch });
    const signatureProvider = new JsSignatureProvider([privateKey]);
    const api = new Api({
      rpc,
      signatureProvider,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    });

    return api.transact(txData,meta)
  }

  private checkAndIssueBearerToken() {
    this.issueBearerToken();
    this.$interval(() => this.issueBearerToken(), 30 * 60 * 1000)
  }

  private formHeader() {
    return {
      headers: {
        'authorization': `Bearer ${this.bearerToken}`
      }
    }
  }

  public getPublicKeyAccounts = (publicKey: string) => {
    let deferred = this.$q.defer<any>();
    this.$http.get(`https://www.api.bloks.io/jungle/dfuse?type=state_key_accounts&publicKey=${publicKey}`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data.data) {
        deferred.resolve(data.data.account_names)
      }
      else
        deferred.reject()
    }).catch(()=> deferred.reject());
    return deferred.promise;
  }

  public issueBearerToken = () => {
    this.$http.post(`https://auth.dfuse.io/v1/auth/issue/`, { "api_key": "web_3db569db391c1a43d7f75014d917e53e" }, { headers: { 'Content-Type': 'application/json' } }).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data) {
        // this.bearerToken = data.token;
      }
    });
  }

  public getTransactions = (account, firstIndex = 0, lastIndex = 10) => {
    let deferred = this.$q.defer<any>();
    this.$http.get(`https://www.api.bloks.io/jungle/dfuse?type=search_transactions&q=account:eosio.token receiver:eosio.token (data.from:${account} OR data.to:${account})&sort=desc&limit=10&with_reversible=false`).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret));
      if (data.data && data.data.transactions && data.data.transactions.length !== 0) {
        deferred.resolve(data.data.transactions)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }

  public getTransactionStatus = (transactionId) => {
    let deferred = this.$q.defer<any>();
    this.$http.get(`https://www.api.bloks.io/jungle/dfuse?type=fetch_transaction&id=${transactionId}`, this.formHeader()).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.data && data.data.transaction)
        deferred.resolve(data.data)
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  private getCachedAccountBalance = (address: string) => {
    if (this.cachedGetCachedAccountBalance.get(address))
      return this.cachedGetCachedAccountBalance.get(address)
    let deferred = this.$q.defer<string>();
    this.cachedGetCachedAccountBalance.set(address, deferred.promise)
    this.getBalanceFromChain(address).then(deferred.resolve, deferred.reject)
    this.cachedGetCachedAccountBalance.get(address).finally(() => {
      setTimeout(() => {
        this.cachedGetCachedAccountBalance.set(address, null);
      }, 30 * 1000)
    })
    return this.cachedGetCachedAccountBalance.get(address)
  }

  private getBalanceFromChain = (account: string) => {
    let deferred = this.$q.defer<string>();
    this.$http.post(`https://api.jungle.alohaeos.com/v1/chain/get_currency_balance`, { "code": "eosio.token", "account": account, "symbol": "EOS" }).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data != [])
        deferred.resolve(data[0])
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }

  public getBalance = (account: string) => {
    let deferred = this.$q.defer<string>();
    this.$http.post(`https://api.jungle.alohaeos.com/v1/chain/get_currency_balance`, { "code": "eosio.token", "account": account, "symbol": "EOS" }).then(ret => {
      let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
      if (data.data && data.data.length !== 0)
        deferred.resolve(data.data[0].split(" ")[0])
      else
        deferred.reject(data.errorDescription)
    });
    return deferred.promise;
  }
}
