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
declare var require : any;
@Service('cloud')
@Inject('$q','$http','settings','user','$timeout','address','env')
class CloudService {

  public api = new CloudAPI(this, this.user, this.$q, this.address);
  public socket = new CloudSocket(this.user, this.$q, this.$timeout, this.settings);
  public events = new CloudEvents(this);

  constructor(public $q: angular.IQService,
              private $http,
              private settings: SettingsService,
              private user: UserService,
              private $timeout: angular.ITimeoutService,
              private address: AddressService,
              private env: EnvService) {}

  getAuthData(): Object {
    var timestamp = Date.now();
    var baseMessage = this.user.accountRS + timestamp;
    var message = converters.stringToHexString(baseMessage);
    var secret = converters.stringToHexString(this.user.secretPhrase)
    var signature = heat.crypto.signBytes(message, secret);
    return {
      auth: {
        accountRS: this.user.accountRS,
        timestamp: timestamp,
        signature: signature,
        publicKey: this.user.publicKey
      }
    }
  }

  send(route: string, request: any, withAuth?: boolean, returns?: string): angular.IPromise<any> {
    var deferred = this.$q.defer();
    var req = request||{};
    if (withAuth) {
      req = angular.extend(req, this.getAuthData());
    }

    if (this.env.type == EnvType.BROWSER) {
      this.browserHttpPost(
        [this.settings.get(SettingsService.CLOUD_HOST),':',
         this.settings.get(SettingsService.CLOUD_PORT),'/',route].join(''),
        req,
        {headers: {'Content-Type': 'application/json'} },
        (response)=>{
          this.logResponse(route, request, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        },(response)=>{
          this.logErrorResponse(route, request, response);
          deferred.reject();
        }
      );
    }
    else if (this.env.type == EnvType.NODEJS) {
      this.nodeHttpPost(
        this.settings.get(SettingsService.CLOUD_HOST).replace(/^(\w+:\/\/)/,''),
        this.settings.get(SettingsService.CLOUD_PORT),
        '/' + route,
        req,
        (response)=>{
          console.log("BACK FROM nodeHttpPost",response);
          this.logResponse(route, request, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        },(response)=>{
          this.logErrorResponse(route, request, response);
          deferred.reject();
        }
      )
    }
    return deferred.promise;
  }

  private browserHttpPost(url: string, request: any, headers: any, onSuccess: Function, onFailure: Function) {
    this.$http.post(url, request, headers).then(
      (response) => {
        if ((angular.isDefined(response.data.success) && !response.data.success))
          onFailure(response);
        else
          onSuccess(response);
      },
      (response) => { onFailure(response) }
    )
  }

  /* Private lazy collection of loaded nodejs requires */
  private node: any;

  private nodeHttpPost(hostname: string, port: number, path: string, request: any, onSuccess: Function, onFailure: Function) {
    this.node = this.node || { http: require('https') };
    var body = JSON.stringify(request);
    var options = {
      hostname: hostname, port: port, path: path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Content-Length": converters.stringToByteArray(body).length
      }
    };
    var req = this.node.http.request(options, (res) => {
      res.setEncoding('utf8');
      var body = [];
      res.on('data', (chunk) => { body.push(chunk) });
      res.on('end', () => {
        var response = {data: JSON.parse(body.join(''))};
        if ((angular.isDefined(response.data.success) && !response.data.success))
          onFailure(response)
        else
          onSuccess(response)
      });
    });
    req.on('error', (e) => { onFailure(e) });
    req.write(body);
    req.end();
  }

  private logResponse(route: string, request: any, response: any) {
    if (this.settings.get(SettingsService.LOG_CLOUD_ALL)) {
      console.log(`CLOUD [${route}]`, {
        request: request,
        response: response
      })
    }
  }

  private logErrorResponse(route: string, request: any, response: any) {
    if (this.settings.get(SettingsService.LOG_CLOUD_ERRORS)) {
      console.error(`CLOUD [${route}]`, {
        request: request,
        response: response
      })
    }
  }

  mock<T>(data:any): angular.IPromise<T> {
    var deferred = this.$q.defer();
    deferred.resolve(data);
    return deferred.promise
  }
}