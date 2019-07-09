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

/* Wraps all API returned server errors */
class ServerEngineError {
  public description: string;
  public code: number;
  constructor(public data: any) {
    if (angular.isObject(data)) {
      this.description = data['errorDescription'] || data['error'];
      this.code = data['errorCode'] || -1;
    } else {
      this.description = 'misc error';
      this.code = 99;
    }
  }
}

class InternalServerTimeoutError extends ServerEngineError {
  constructor() {
    super({ error: 'Internal timeout' });
  }
}

@Service('heat')
@Inject('$q','$http','settings','user','$timeout','env')
class HeatService {

  public api = new HeatAPI(this, this.user, this.$q);
  public subscriber = this.createSubscriber(this.settings.get(SettingsService.HEAT_WEBSOCKET));

  constructor(public $q: angular.IQService,
              private $http: angular.IHttpService,
              private settings: SettingsService,
              private user: UserService,
              private $timeout: angular.ITimeoutService,
              private env: EnvService) {
  }

  public createSubscriber(url: string)  {
    return new HeatSubscriber(url, this.$q, this.$timeout);
  }

  public resetSubscriber()  {
    this.subscriber.reset(this.settings.get(SettingsService.HEAT_WEBSOCKET));
  }

  getAuthData(): Object {
    var timestamp = Date.now();
    var baseMessage = this.user.account + timestamp;
    var message = converters.stringToHexString(baseMessage);
    var secret = converters.stringToHexString(this.user.secretPhrase)
    var signature = heat.crypto.signBytes(message, secret);
    return {
      auth: {
        accountRS: this.user.account,
        timestamp: timestamp,
        signature: signature,
        publicKey: this.user.publicKey
      }
    }
  }

  get(route: string, returns?: string): angular.IPromise<any> {
    return this.getRaw(this.settings.get(SettingsService.HEAT_HOST),
      this.settings.get(SettingsService.HEAT_PORT), route, returns);
  }

  getRaw(host: string, port: number, route: string, returns?: string, ignoreErrorResponse?: boolean): angular.IPromise<any> {
    route = "api/v1" + route;
    var deferred = this.$q.defer();
    if (this.env.type == EnvType.BROWSER) {
      this.browserHttpGet(
        [host,':',port,'/',route].join(''),
        {headers: {'Content-Type': 'application/json'} },
        (response)=>{
          this.logResponse(route, null, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        },(response)=>{
          if (ignoreErrorResponse === undefined || !ignoreErrorResponse) {
            this.logErrorResponse(route, null, response);
          }
          deferred.reject(new ServerEngineError(response.data));
        }
      );
    }
    else if (this.env.type == EnvType.NODEJS) {
      var isHttps = host.indexOf('https://') == 0;
      this.nodeHttpGet(
        isHttps,
        host.replace(/^(\w+:\/\/)/,''),
        port,
        '/' + route,
        (response)=>{
          this.logResponse(route, null, response);
          var data = angular.isString(returns) ? response[returns] : response;
          deferred.resolve(data);
        },(response)=>{
          this.logErrorResponse(route, null, response);
          deferred.reject(new ServerEngineError(response));
        }
      )
    }
    return deferred.promise;
  }

  private browserHttpGet(url: string, config: any, onSuccess: Function, onFailure: Function) {
    this.$http.get(url, config).then(
      (response: any) => {
        if (angular.isDefined(response.data.errorDescription))
          onFailure(response);
        else
          onSuccess(response);
      },
      (response) => { onFailure(response) }
    )
  }

  private nodeHttpGet(isHttps: boolean, hostname: string, port: number, path: string, onSuccess: Function, onFailure: Function) {
    var options = {
      hostname: hostname, port: port, path: path, method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    var http = require(isHttps ? 'https':'http');
    var req = http.request(options, (res) => {
      res.setEncoding('utf8');
      var body = [];
      res.on('data', (chunk) => { body.push(chunk) });
      res.on('end', () => {
        var response = JSON.parse(body.join(''));
        if (angular.isDefined(response.errorDescription))
          onFailure(response)
        else
          onSuccess(response)
      });
    });
    req.on('error', (e) => { onFailure(e) });
    req.end();
  }

  post(route: string, request: any, withAuth?: boolean, returns?: string, localHostOnly?: boolean): angular.IPromise<any> {
    let host = localHostOnly ? this.settings.get(SettingsService.HEAT_HOST_LOCAL) : this.settings.get(SettingsService.HEAT_HOST);
    let port = localHostOnly ? this.settings.get(SettingsService.HEAT_PORT_LOCAL) : this.settings.get(SettingsService.HEAT_PORT);
    return this.postRaw(host, port, route, request, withAuth, returns, localHostOnly);
  }

  postRaw(host: string, port: number, route: string, request: any, withAuth?: boolean, returns?: string, localHostOnly?: boolean): angular.IPromise<any> {
    route = "api/v1" + route;
    var deferred = this.$q.defer();
    var req = request||{};
    if (withAuth) {
      req = angular.extend(req, this.getAuthData());
    }
    if (this.env.type == EnvType.BROWSER) {
      let address = [host,':',port,'/',route].join('');
      if (localHostOnly) {
        if (address.indexOf('http://localhost')!=0) {
          deferred.reject(new ServerEngineError({
            errorDescription: `Operation allowed to localhost only! ${address} is not allowed`,
            errorCode: 10
          }));
        }
      }
      this.browserHttpPost(address, req,
        (response)=>{
          this.logResponse(route, request, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        },(response)=>{
          this.logErrorResponse(route, request, response);
          deferred.reject(new ServerEngineError(response.data));
        }
      );
    }
    else if (this.env.type == EnvType.NODEJS) {
      let address = host.replace(/^(\w+:\/\/)/,'');
      if (localHostOnly) {
        if (address.indexOf('localhost')!=0) {
          deferred.reject(new ServerEngineError({
            errorDescription: `Operation allowed to localhost only ${address} is not allowed`,
            errorCode: 10
          }));
        }
      }
      var isHttps = host.indexOf('https://') == 0;
      this.nodeHttpPost(isHttps, address, port, '/' + route, req,
        (response)=>{
          this.logResponse(route, request, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        },(response)=>{
          this.logErrorResponse(route, request, response);
          deferred.reject(new ServerEngineError(response.data));
        }
      )
    }
    return deferred.promise;
  }

  private browserHttpPost(url: string, request: any, onSuccess: Function, onFailure: Function) {
    this.$http({
        method: 'POST',
        url: url,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: request
    }).then(
      (response:any) => {
        if (angular.isDefined(response.data.errorDescription))
          onFailure(response);
        else
          onSuccess(response);
      },
      (response) => { onFailure(response) }
    );
  }

  private nodeHttpPost(isHttps: boolean, hostname: string, port: number, path: string, request: any, onSuccess: Function, onFailure: Function) {
    var querystring = require('querystring');
    var body = querystring.stringify(request);
    var options = {
      hostname: hostname, port: port, path: path, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        "Content-Length": body.length
      }
    };
    var http = require(isHttps ? 'https':'http');
    var req = http.request(options, (res) => {
      res.setEncoding('utf8');
      var body = [];
      res.on('data', (chunk) => { body.push(chunk) });
      res.on('end', () => {
        var response = { data: JSON.parse(body.join('')) };
        if (angular.isDefined(response.data.errorDescription))
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
    if (this.settings.get(SettingsService.LOG_HEAT_ALL)) {
      console.log(`HEAT [${route}]`, {
        request: request,
        response: response
      })
    }
  }

  private logErrorResponse(route: string, request: any, response: any) {
    if (this.settings.get(SettingsService.LOG_HEAT_ERRORS)) {
      console.error(`HEAT [${route}]`, {
        request: request,
        response: response
      })
    }
  }

  mock<T>(data:any): angular.IPromise<T> {
    let deferred = this.$q.defer<T>();
    deferred.resolve(data);
    return deferred.promise
  }

  getHeatMessageContents(message: IHeatMessage|IHeatPayment|IHeatTransaction) {
    try {
      if (message.messageIsEncrypted || message.messageIsEncryptedToSelf) {
        var byteArray = converters.hexStringToByteArray(message.messageBytes);
        var nonce = converters.byteArrayToHexString(byteArray.slice(0, 32));
        var data = converters.byteArrayToHexString(byteArray.slice(32));
        if (message.recipient == this.user.account) {
          return heat.crypto.decryptMessage(data, nonce, message.senderPublicKey, this.user.secretPhrase);
        }
        else if (message.sender == this.user.account) {
          return heat.crypto.decryptMessage(data, nonce, message.recipientPublicKey, this.user.secretPhrase);
        }
      }
      else if (message.messageIsText) {
        return converters.hexStringToString(message.messageBytes);
      }
      else {
        return message.messageBytes ? '[BINARY] ' + message.messageBytes : '';
      }
    } catch (e) {
      console.log('Message parse exception', message, e);
      return '** could not parse message bytes **'
    }
  }
}
