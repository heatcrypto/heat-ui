@Service('nemBlockExplorerService')
@Inject('$q', 'http')
class NemBlockExplorerService {
  private url: string;

  constructor(
    private $q: angular.IQService,
    private http: HttpService) {
    this.setUrl()
  }

  public setUrl(url = 'http://35.247.149.198:7890/') {
    this.url = url;
  }

  public getUrl() {
    return this.url;
  }

  public getAccount = (account) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}account/get?address=${account}`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret));
      if (!data.error) {
        deferred.resolve(data)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }

  public getTransactions = (account, lastTxHash?) => {
    let deferred = this.$q.defer<any>();
    let url = lastTxHash ? `${this.url}account/transfers/all?address=${account}&hash=${lastTxHash}` : `${this.url}account/transfers/all?address=${account}`
    this.http.get(url).then(ret => {
      let data = JSON.parse(JSON.stringify(ret));
      if (data.data) {
        deferred.resolve(data.data)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }

  public getUnconfirmedTransactions = (account) => {
    let deferred = this.$q.defer<any>();
    this.http.get(`${this.url}account/unconfirmedTransactions?address=${account}`).then(ret => {
      let data = JSON.parse(JSON.stringify(ret));
      if (data.data) {
        deferred.resolve(data.data)
      }
      else
        deferred.reject()
    });
    return deferred.promise;
  }
}