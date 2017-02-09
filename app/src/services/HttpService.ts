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
@Service('http')
@Inject('$http','env','$q')
class HttpService {

  constructor(private $http: angular.IHttpService,
              private env: EnvService,
              private $q: angular.IQService) {
    if (env.type==EnvType.NODEJS) {
      try {
        require('ssl-root-cas').inject();
      } catch (e) {
        console.log(e);
      }
    }
  }

  public get(url:string): angular.IPromise<string> {
    var deferred = this.$q.defer();
    if (this.env.type == EnvType.BROWSER) {
      this.browserHttpGet(url, deferred.resolve, deferred.reject);
    }
    else {
      this.nodeHttpGet(url, deferred.resolve, deferred.reject);
    }
    return deferred.promise;
  }

  private browserHttpGet(url: string, onSuccess: Function, onFailure: Function) {
    this.$http.get(url, {
        headers: {
          'Content-Type': 'application/text'
        }
      }).then(
      (response: any) => { onSuccess(response.data) },
      (response) => { onFailure(response.data) }
    )
  }

  private nodeHttpGet(url: string, onSuccess: Function, onFailure: Function) {
    var _url = require('url').parse(url);
    var options = {
      hostname: _url.hostname, port: _url.port, path: _url.path, method: 'GET',
      headers: {
      'Content-Type': 'application/text'
      }
    };

    var http = require(_url.protocol.indexOf('https')==0 ? 'https':'http');
    var req = http.request(options, (res) => {
      res.setEncoding('utf8');
      var body = [];
      res.on('data', (chunk) => {
        body.push(chunk)
      });
      res.on('end', () => {
        onSuccess(body.join(''))
      });
    });
    req.on('error', (e) => {
      onFailure(e)
    });
    req.end();
  }
}