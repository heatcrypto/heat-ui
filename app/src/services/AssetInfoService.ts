/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
interface AssetInfo {
  id: string;
  description: string;
  descriptionUrl: string;
  decimals: number;
  symbol: string;
  name: string;
  certified: boolean;
}

interface AssetPropertiesProtocol1 {
  symbol: string;
  name: string;
  certified?: boolean;
}

@Service('assetInfo')
@Inject('heat', '$q','assetCertification','http')
class AssetInfoService {

  cache: IStringHashMap<AssetInfo> = {};

  constructor(private heat: HeatService,
              private $q: angular.IQService,
              private assetCertification: AssetCertificationService,
              private http: HttpService) {
    this.cache["0"] = {
      id: "0",
      description: "HEAT Cryptocurrency",
      descriptionUrl: "",
      decimals: 8,
      symbol: "HEAT",
      name: "HEAT Cryptocurrency",
      certified: true
    };
  }

  getInfo(asset: string): angular.IPromise<AssetInfo> {
    var deferred = this.$q.defer();
    if (angular.isDefined(this.cache[asset])) {
      deferred.resolve(this.cache[asset]);
    }
    else {
      this.heat.api.getAssetProperties(asset, "0", 1).then((data) => {
        var properties = this.parseProperties(data.properties, {
          symbol: asset.substring(0, 4),
          name: asset,
          certified: false
        });
        var info: AssetInfo = {
          id: asset,
          description: null,
          descriptionUrl: data.descriptionUrl,
          decimals: data.decimals,
          symbol: properties.symbol,
          name: properties.name,
          certified: false
        };
        this.assetCertification.getInfo(asset).then((certificationData)=> {
          if (certificationData.certified) {
            info.symbol = certificationData.symbol;
            info.name = certificationData.name;
            info.certified = certificationData.certified;
          }
          deferred.resolve(info);
        }, deferred.reject);
      }, deferred.reject);
    }
    return deferred.promise;
  }

  public parseProperties(properties: string, fallback: AssetPropertiesProtocol1): AssetPropertiesProtocol1 {
    try {
      var json = JSON.parse(properties);
      return {
        symbol: json[0],
        name: json[1],
        certified: false
      };
    } catch (e) {
      //console.error(e);
    }
    return fallback;
  }

  public stringifyProperties(properties: AssetPropertiesProtocol1) {
    return JSON.stringify([properties.symbol, properties.name]);
  }

  public getAssetDescription(info: AssetInfo): angular.IPromise<string> {
    var deferred = this.$q.defer();
    if (angular.isString(info.description) || !info.descriptionUrl) {
      deferred.resolve(info.description||"No description available ...");
    }
    else {
      this.http.get(info.descriptionUrl).then((text)=>{
        info.description = text;
        deferred.resolve(text);
      }, deferred.reject);
    }
    return deferred.promise;
  }
}