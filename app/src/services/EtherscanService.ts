@Service('etherscanService')
@Inject('$q','http', 'settings')
class EtherscanService {

  constructor(private $q: angular.IQService,
              private http: HttpService,
              private settingsService: SettingsService) {}

  public getEtherTransactions(address: string, firstIndex: number, lastIndex: number): angular.IPromise<any> {
    let deferred = this.$q.defer<string>();
    let noData = "No transactions available ...";
    let url = this.settingsService.get(SettingsService.ETHERSCAN_TRANSACTION_URL)
                .replace(":address", address)
                .replace(":apiToken", this.settingsService.get(SettingsService.ETHERSCAN_API_TOKEN))
                .replace(":page", (firstIndex/10).toString())
                .replace(":offset", (lastIndex).toString())
    this.http.get(url)
    .then((response)=>{
      var parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.result);
    }, () => {
      deferred.resolve(noData);
    });
    return deferred.promise;
  }
 }
