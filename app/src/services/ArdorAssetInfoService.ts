@Service('ardorAssetInfo')
@Inject('heat', '$q', 'ardorBlockExplorerService')
class ArdorAssetInfoService {

  cache: IStringHashMap<AssetInfo> = {};

  constructor(private heat: HeatService,
              private $q: angular.IQService,
              private ardorBlockExplorerService: ArdorBlockExplorerService) {

    this.cache["ardor"] = {
      id: "ardor",
      description: "IGNIS Cryptocurrency based on ARDOR platform",
      descriptionUrl: "",
      decimals: 8,
      symbol: "IGNIS",
      name: "IGNIS",
      certified: true,
      timestamp: 100149557,
      issuer: "ARDOR",
      issuerPublicName: "ARDOR"
    };
  }

  getInfo(asset: string): angular.IPromise<AssetInfo> {
    let deferred = this.$q.defer<AssetInfo>();
    if (angular.isDefined(this.cache[asset])) {
      deferred.resolve(this.cache[asset]);
    } else {
      this.ardorBlockExplorerService.getAssetInfo(asset).then((data) => {
        var info: AssetInfo = {
          id: asset,
          description: null,
          descriptionUrl: data.descriptionUrl,
          decimals: data.decimals,
          symbol: data.name,
          name: data.name,
          certified: false,
          timestamp: data.timestamp,
          issuer: data.account,
          issuerPublicName: data.accountPublicName
        };
        this.cache[asset] = info;
        deferred.resolve(info);
      }, deferred.reject);
    }
    return deferred.promise;
  }
}