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

interface QueuedRequest {
  url: string;
  promise: angular.IPromise<string>
}

@Service('http')
@Inject('$http','env','$q')
class HttpService {

  /**
   * The queue index in this.queues is obtained by comparing the url of the GET request
   * to the prefixes in this.throttled. If the url starts with this.throttled[0] the index
   * in this.queues should be 0, if it starts with this.throttled[1] the index is 1 etc.
   *
   * When no QueuedRequest are in the this.queues[index] one is created and the request
   * is performed immediately, if there is anything in the queue the request
   */
  private throttled = ['https://blockexplorer.com', 'https://api.ethplorer.io', 'https://insight.bitpay.com']
  private queues: Array<Array<QueuedRequest>>

  constructor(private $http: angular.IHttpService,
              private env: EnvService,
              private $q: angular.IQService) {
    this.queues = []
    for (let i=0; i<this.throttled.length; i++)
      this.queues.push([])
  }

  private dumpQueue() {
    let s = ['HTTP QUEUES :: -->']
    for (let i=0; i<this.throttled.length; i++) {
      for (let j=0; j<this.queues[i].length; j++) {
        s.push(this.queues[i][j].url)
      }
    }
    console.log(s.join('\n'))
  }

  /**
   * The promise gets resolved or rejected when the internal GET request completes.
   * It is our signal to look in the queue of pending requests for the next
   * request whose turn it is to execute.
   **/
  private waitTurn(url: string, promise: angular.IPromise<any>) {

    /* Find the index for the domain */
    let index = -1
    for (let i=0; i<this.throttled.length; i++) {
      if (url.startsWith(this.throttled[i])) {
        index = i
        break
      }
    }

    /* Not a throttled domain - return resolved promise so request can run right away */
    if (index == -1) {
      let deferred = this.$q.defer();
      deferred.resolve()
      return deferred.promise
    }

    /* Request must be throttled do so by placing it on the queue, register a listener
       for when it completes so it can be autoremoved from the queue. We cleanup the
       first entry from the queue since thats the one being executed. */
    let queue = this.queues[index]
    let nextRequest = queue[queue.length-1] // we will run AFTER this request (if any)
    let request: QueuedRequest = {
      url: url,
      promise: promise
    }
    queue.push(request)
    this.dumpQueue()
    request.promise.finally(()=>{
      let i = queue.indexOf(request)
      if (i != -1) queue.splice(i, 1)
      this.dumpQueue()
    })

    let deferred = this.$q.defer();

    /* Trigger promise after the last request in the pool completes */
    if (nextRequest) {
      nextRequest.promise.finally(deferred.resolve)
    }
    else {
      deferred.resolve()
    }
    return deferred.promise
  }

  public get(url:string): angular.IPromise<string> {
    let deferred = this.$q.defer<string>();
    let promise = deferred.promise
    this.waitTurn(url, promise).then(() => {
      if (this.env.type == EnvType.BROWSER) {
        this.browserHttpGet(url, deferred.resolve, deferred.reject);
      }
      else {
        this.nodeHttpGet(url, deferred.resolve, deferred.reject);
      }
    })
    return promise;


    // let deferred = this.$q.defer<string>();
    // if (this.env.type == EnvType.BROWSER) {
    //   this.browserHttpGet(url, deferred.resolve, deferred.reject);
    // }
    // else {
    //   this.nodeHttpGet(url, deferred.resolve, deferred.reject);
    // }
    // return deferred.promise;
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

  public post(url:string, data:{[key:string]:any}): angular.IPromise<Object> {
    let deferred = this.$q.defer<Object>();
    if (this.env.type == EnvType.BROWSER) {
      this.browserHttpPost(url, data, deferred.resolve, deferred.reject);
    }
    else {
      let a = document.createElement('a')
      a.href = url
      let hostname = a.hostname
      let isHttps = a.protocol == 'https:'
      let port = a.port ? parseInt(a.port) : (isHttps ? 443 : 80);
      let path = a.pathname
      this.nodeHttpPost(isHttps, hostname, port, path, data, deferred.resolve, deferred.reject);
    }
    return deferred.promise;
  }

  private browserHttpPost(url: string, data:{[key:string]:any}, onSuccess: Function, onFailure: Function) {
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
      data: data
  }).then(
    (response:any) => { onSuccess(response.data) },
    (response) => { onFailure(response.data) }
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
        onSuccess(JSON.parse(body.join('')))
      });
    });
    req.on('error', (e) => { onFailure(e) });
    req.write(body);
    req.end();
  }
}