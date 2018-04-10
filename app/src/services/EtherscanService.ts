@Service('etherscanService')
@Inject('$q','http')
class EtherscanService {

  static readonly API_TOKEN = "KJ3Z8NK48PPIIMN7W5WGKBNE3QQBY2GBXA";
  static readonly ETHER_TRANSACTION_URL = "http://api-ropsten.etherscan.io/api?module=account&action=txlist&address=:address&startblock=0&endblock=99999999&page=:page&offset=:offset&sort=desc&apikey=:apiToken";
  static readonly GET_CONTRACT_ABI_URL = "https://api.etherscan.io/api?module=contract&action=getabi&address=:contractAddress&apikey=:apiToken";
  constructor(private $q: angular.IQService,
              private http: HttpService) {}

  public getEtherTransactions(address: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<string>();
    let noData = "No transactions available ...";
    let getUrl = EtherscanService.ETHER_TRANSACTION_URL
                .replace(":address", address)
                .replace(":apiToken", EtherscanService.API_TOKEN)
                .replace(":page", (firstIndex/10).toString())
                .replace(":offset", (lastIndex).toString())
    this.http.get(getUrl)
    .then((response)=>{
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.result);
    }, () => {
      deferred.resolve(noData);
    });
    return deferred.promise;
  }
 }
