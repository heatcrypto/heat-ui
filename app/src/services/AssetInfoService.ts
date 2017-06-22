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
  timestamp: number;
  issuer: string;
  issuerPublicName: string;
}

interface AssetPropertiesProtocol1 {
  symbol: string;
  name: string;
  certified?: boolean;
}

@Service('assetInfo')
@Inject('heat', '$q','assetCertification','http')
class AssetInfoService {

  // Heat Ledger Ltd certified assets symbols.
  certifiedSymbols = {
    "btc": "5592059897546023466",
    "fimk": "8593933499455210945",
    "gnt": "12638687347417181640"
  };

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
      certified: true,
      timestamp: 100149557,
      issuer: "8150091319858025343",
      issuerPublicName: "HEAT blockchain Genesis account"
    };
  }

  getDisplaySymbol(asset: string, symbol: string) {
    let lowerCaseSymbol = symbol.toLowerCase();
    if (angular.isString(this.certifiedSymbols[lowerCaseSymbol])) {
      if (this.certifiedSymbols[lowerCaseSymbol] != asset) {
        return symbol.slice(0, -1) + '-';
      }
    }
    return symbol;
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
          symbol: this.getDisplaySymbol(asset, properties.symbol||''),
          name: properties.name,
          certified: false,
          timestamp: data.timestamp,
          issuer: data.account,
          issuerPublicName: data.accountPublicName
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
    let noDescription = "No description available ...";
    if (angular.isString(info.description) || !info.descriptionUrl) {
      deferred.resolve(info.description||noDescription);
    }
    else {
      this.http.get(info.descriptionUrl).then((text)=>{
        info.description = text;
        deferred.resolve(text);
      }, () => {
        deferred.resolve(noDescription);
      });
    }
    return deferred.promise;
  }
}