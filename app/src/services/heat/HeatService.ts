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
@Inject('$q','$http','settings','user','$timeout','$interval','env', '$rootScope')
class HeatService {

  public api = new HeatAPI(this, this.user, this.$q);
  public subscriber = this.createSubscriber(this.settings.get(SettingsService.HEAT_WEBSOCKET));

  constructor(public $q: angular.IQService,
              private $http: angular.IHttpService,
              public settings: SettingsService,
              private user: UserService,
              private $timeout: angular.ITimeoutService,
              private $interval: angular.IIntervalService,
              private env: EnvService,
              private $rootScope: angular.IScope) {

    let initBaseTime = () => this.api.baseTimestamp().then(basetimestamp => {
      utils.setBaseTimestamp(parseInt(basetimestamp))
    })
    this.settings.initialized.then(v => initBaseTime())
    try {
      initBaseTime()
    } catch (e) {
      console.error(e)
    }
    $rootScope.$on('HEAT_SERVER_LOCATION', (event, nothing) => {
      try {
        initBaseTime()
      } catch (e) {
        console.error(e)
      }
    });

    let refreshInterval = $interval(() => {
      if (utils.isBaseDate()) {
        $interval.cancel(refreshInterval);
      } else {
        initBaseTime()
      }
    }, 3 * 1000, 0, false);
  }

  public createSubscriber(url: string)  {
    return new HeatSubscriber(url, this.$q, this.$timeout);
  }

  public resetSubscriber()  {
    this.subscriber.reset(this.settings.get(SettingsService.HEAT_WEBSOCKET));
  }

  public switchToServer(
      connectionWay?: {way: "local" | "remote", failoverEnabled: boolean, sameMessagingHost: boolean},
      serverDescriptor?: ServerDescriptor) {
    if (connectionWay) this.settings.setConnectionWay(connectionWay)
    if (serverDescriptor) this.settings.setCurrentServer(serverDescriptor)
    this.resetSubscriber()
    this.$rootScope.$emit('HEAT_SERVER_LOCATION', "nothing")
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

  get(route: string, returns?: string, ignoreErrorResponse = false, isFile?: boolean,
      hostPort?: { host: string, port: number }): angular.IPromise<any> {
    return this.getRaw(
      hostPort ? hostPort.host : this.settings.get(SettingsService.HEAT_HOST),
      hostPort ? hostPort.port : this.settings.get(SettingsService.HEAT_PORT),
      route,
      returns,
      ignoreErrorResponse,
      isFile
    )
  }

  getRaw(host: string, port: number, route: string, returns?: string, ignoreErrorResponse?: boolean, isFile?: boolean): angular.IPromise<any> {
    route = "api/v1" + route;
    var deferred = this.$q.defer();
    if (this.env.type == EnvType.BROWSER) {
      let portStr = port ? `:${port}` : ""
      let config
      if (isFile) {
        config = {
          headers: {'Content-Type': undefined},
          transformResponse: [
            function (data) {
              return data;
            }
          ],
          responseType: "arraybuffer"  //arraybuffer/blob/json/text/document
        }
      } else {
        config = {
          headers: {'Content-Type': 'application/json'}
        }
      }
      this.browserHttpGet(
        [host, portStr, '/', route].join(''),
        config,
        (response) => {
          this.logResponse(route, null, response);
          var data = angular.isString(returns) ? response.data[returns] : response.data;
          deferred.resolve(data);
        }, (response) => {
          if (ignoreErrorResponse) {
            deferred.resolve()
          } else {
            this.logErrorResponse(route, null, response)
            deferred.reject(new ServerEngineError(isFile ? response : response.data))
          }
        }
      );
    } else if (this.env.type == EnvType.NODEJS) {
      var isHttps = host.indexOf('https://') == 0;
      this.nodeHttpGet(
        isHttps,
        host.replace(/^(\w+:\/\/)/, ''),
        port,
        '/' + route,
        (response) => {
          this.logResponse(route, null, response);
          var data = angular.isString(returns) ? response[returns] : response;
          deferred.resolve(data);
        }, (response) => {
          if (ignoreErrorResponse) {
            deferred.resolve()
          } else {
            this.logErrorResponse(route, null, response)
            let data = Object.assign(response, { host: host, port: port, route: route, response: response })
            deferred.reject(new ServerEngineError(data))
          }
        },
        isFile
      )
    }
    return deferred.promise;
  }

  private browserHttpGet(url: string, config: any, onSuccess: Function, onFailure: Function) {
    this.$http.get(url, config).then(
      (response: any) => {
        if (angular.isDefined(response.data.errorDescription)) {
          onFailure(response);
        } else {
          onSuccess(response);
        }
      },
      (response) => { onFailure(response) }
    )
  }

  private nodeHttpGet(isHttps: boolean, hostname: string, port: number, path: string, onSuccess: Function, onFailure: Function, isFile?: boolean) {
    let options = {
      hostname: hostname, port: port, path: path, method: 'GET',
      headers: {
        'Content-Type': isFile ? 'multipart/form-data' : 'application/json'
      }
    }
    //require("tls").DEFAULT_ECDH_CURVE = "auto"
    let http = require(isHttps ? 'https':'http')
    let req = http.request(options, (res) => {
      if (isFile) {
        if (res.statusCode == 200) {
          let chunkArray = []
          res.on('data', (chunk) => chunkArray.push(chunk))
          res.on('end', () => {
            onSuccess(Buffer.concat(chunkArray))
          })
        } else {
          onFailure(res.statusMessage || res)
        }
      } else {
        res.setEncoding('utf8')
        let body = []
        res.on('data', (chunk) => {body.push(chunk)})
        res.on('end', () => {
          let response
          let content = body.join('')
          try {
            response = JSON.parse(content)
            if (angular.isDefined(response.errorDescription)) {
              onFailure(response)
            } else {
              onSuccess(response)
            }
          } catch (e) {
            console.error("response in not JSON parseable: \n" + content)
            onFailure(content)
          }
        })
      }
    })
    req.on('error', (e) => { onFailure(e) })
    req.end()
  }

  post(route: string, request: any, withAuth?: boolean, returns?: string, localHostOnly?: boolean, isFile?: boolean,
       hostPort?: {host: string, port: number}): angular.IPromise<any> {
    let host
    let port
    if (hostPort) {
      host = hostPort.host
      port = hostPort.port
    } else {
      host = localHostOnly ? this.settings.get(SettingsService.HEAT_HOST_LOCAL) : this.settings.get(SettingsService.HEAT_HOST);
      port = localHostOnly ? this.settings.get(SettingsService.HEAT_PORT_LOCAL) : this.settings.get(SettingsService.HEAT_PORT);
    }
    return this.postRaw(host, port, route, request, withAuth, returns, localHostOnly, isFile);
  }

  postRaw(host: string, port: number, route: string, request: any, withAuth?: boolean, returns?: string,
          localHostOnly?: boolean, isFile?: boolean): angular.IPromise<any> {
    route = "api/v1" + route;
    var deferred = this.$q.defer();
    var req = request || {};
    if (withAuth) {
      req = angular.extend(req, this.getAuthData());
    }
    if (this.env.isBrowser()) {
      let portStr = port ? `:${port}` : ""
      let address = [host, portStr, '/', route].join('');
      if (localHostOnly) {
        if (address.indexOf('http://localhost') != 0) {
          deferred.reject(new ServerEngineError({
            errorDescription: `Operation allowed to localhost only! ${address} is not allowed`,
            errorCode: 10
          }));
        }
      }
      this.browserHttpPost(address, req,
        (response) => {
          this.logResponse(route, request, response);
          let data = angular.isString(response)
            ? response
            : (angular.isString(returns) ? response.data[returns] : response.data)
          deferred.resolve(data);
        }, (response) => {
          this.logErrorResponse(route, request, response);
          deferred.reject(new ServerEngineError(response.data));
        },
        isFile
      );
    } else if (this.env.type == EnvType.NODEJS) {
      let address = host.replace(/^(\w+:\/\/)/, '');
      if (localHostOnly) {
        if (address.indexOf('localhost') != 0) {
          deferred.reject(new ServerEngineError({
            errorDescription: `Operation allowed to localhost only ${address} is not allowed`,
            errorCode: 10
          }));
        }
      }
      var isHttps = host.indexOf('https://') == 0;
      this.nodeHttpPost(isHttps, address, port, '/' + route, req,
        (response) => {
          this.logResponse(route, request, response);
          let data = angular.isString(response)
            ? response
            : (angular.isString(returns) ? response.data[returns] : response.data)
          deferred.resolve(data);
        }, (response) => {
          this.logErrorResponse(route, request, response);
          deferred.reject(new ServerEngineError(response.data));
        },
        isFile
      )
    }
    return deferred.promise;
  }

  private browserHttpPost(url: string, request: any, onSuccess: Function, onFailure: Function, isFile?: boolean) {
    //require("tls").DEFAULT_ECDH_CURVE = "auto"
    let config
    if (isFile) {
      let formData = new FormData()
      formData.append("fileName", request.fileName)
      formData.append("file", new Blob([request.arrayBuffer]))
      config = {
        method: 'POST',
        url: url,
        headers: {'Content-Type': undefined},
        data: formData
      }
    } else {
      config = {
        method: 'POST',
        url: url,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        data: request,
        transformRequest: function (obj) {
          let str = [];
          for (let p in obj) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          }
          return str.join("&");
        }
      }
    }

    this.$http(config).then(
      (response:any) => {
        if (angular.isDefined(response.data.errorDescription)) {
          onFailure(response);
        } else {
          onSuccess(response);
        }
      },
      (response) => { onFailure(response) }
    );
  }

  private nodeHttpPost(isHttps: boolean, hostname: string, port: number, path: string, request: any, onSuccess: Function, onFailure: Function, isFile?: boolean) {
    let http = require(isHttps ? 'https':'http')
    if (isFile) {
      let FormData = require("form-data")
      const form = new FormData()
      form.append('fileName', request.fileName)
      form.append('file', Buffer.from(request.arrayBuffer))
      const req = http.request(
        {
          hostname: hostname, port: port, path: path, method: 'POST',
          headers: form.getHeaders(),
        },
        response => {
          if (response?.statusCode == 200) {
            onSuccess(response.statusMessage)
          } else {
            onFailure(response)
          }
        }
      )
      req.on('error', (e) => { onFailure(e) })
      form.pipe(req)
    } else {
      let querystring = require('querystring')
      let body = querystring.stringify(request)
      let options = {
        hostname: hostname, port: port, path: path, method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            "Content-Length": body.length
          }
      }
      let req = http.request(options, res => {
        res.setEncoding('utf8');
        let respBody = []
        res.on('data', (chunk) => { respBody.push(chunk) })
        res.on('end', () => {
          let responseBody
          try {
            responseBody = JSON.parse(respBody.join(''))
          } catch (e) {
            console.error(e)
            onFailure(res)
          }
          let response = { data: responseBody }
          if (angular.isDefined(response.data.errorDescription)) {
            onFailure(response)
          } else {
            onSuccess(response)
          }
        });
      });
      req.on('error', (e) => { onFailure(e) });
      req.write(body);
      req.end();
    }
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
        if (message.recipient == this.user.account || (message.recipient == '0' && message.sender == this.user.account)) {
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
