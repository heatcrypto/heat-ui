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
class HeatServerEngineError {
  public description: string;
  public code: number;
  constructor(public data: any) {
    this.description = data['errorDescription'];
    this.code = data['errorCode'] || -1;
  }
}

class HeatInternalServerTimeoutError extends HeatServerEngineError {
  constructor() {
    super({ error: 'Internal timeout' });
  }
}

class HeatSocket {

  private url: string;
  private socket: WebSocket;
  private connected: boolean = false;
  private autoReconnect: boolean = true;
  private topics: Array<HeatSocketTopic> = [];
  private pending_send: Object[] = [];
  private rpc_callbacks: IStringHashMap<HeatSocketRPC> = {};
  public open: angular.IPromise<HeatSocket>;

  constructor(private user: UserService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private settings: SettingsService) {

    user.addListener(UserService.EVENT_UNLOCKED, () => {
      this.connect(settings.get(SettingsService.HEAT_WEBSOCKET_URL));
    });

    user.addListener(UserService.EVENT_LOCKED, () => {
      this.close();
    });

    /*

    This code works but should not run when no user has logged in
    -------------------------------------------------------------
    this.connect(settings.get(SettingsService.HEAT_WEBSOCKET_URL)).then(() => {

      console.log("Gonna call 'sayfoo'")
      this.rpc("sayfoo",{}).then((data) => {

        console.log("Got this back from 'sayfoo'", data);

        console.log("Gonna call 'sayfooasync'")
        this.rpc("sayfooasync",{}).then((data) => {

          console.log("Got this back from 'sayfooasync'", data);
        })
      });

      this.subscribe("message", {}, (data) => {
        console.log("PUSH message", data);
      })

    })
    */
  }

  public connect(url: string): angular.IPromise<HeatSocket> {
    if (this.connected) { throw new Error('Can not connect while connected') }
    var deferred = this.$q.defer();
    this.open = deferred.promise;

    // this.url = url;
    // this.socket = new WebSocket(this.getAuthenticatedURL(url));
    // this.socket.onclose = (event) => { this.onclose(event) };
    // this.socket.onopen = (event) => { this.onopen(event, deferred); };
    // this.socket.onerror = (event) => { this.onerror(event) };
    // this.socket.onmessage = (event) => { this.onmessage(event) };
    // this.autoReconnect = true;
    return this.open;
  }

  public close() {
    this.autoReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public send(argv: Object, skipCache?: boolean): boolean {
    if (this.socket && this.socket.readyState == 1) {
      this.socket.send(JSON.stringify(argv));
      return true;
    }
    if (!skipCache) {
      this.pending_send.push(argv);
    }
    return false;
  }

  public subscribe(topicName: string, params: IStringHashMap<string>, callback: Function) : () => void {
    var topic = new HeatSocketTopic(topicName.toUpperCase(), params);
    var existing = this.topics.find((t) => t.equals(topic));
    if (!existing) {
      existing = topic;
      this.topics.push(topic);
      this.send(topic.subscribe(), true);
    }
    existing.listeners.push(callback);
    return () => this.unsubscribe(topicName, params, callback);
  }

  public unsubscribe(topicName: string, params: IStringHashMap<string>, callback: Function) {
    var topic = new HeatSocketTopic(topicName.toUpperCase(), params);
    var existing = this.topics.find((t) => t.equals(topic));
    if (existing) {
      existing.listeners = existing.listeners.filter((cb) => cb !== callback);
      if (existing.listeners.length == 0) {
        this.topics = this.topics.filter((t) => !t.equals(topic))
        this.send(topic.unsubscribe());
      }
    }
  }

  private getAuthenticatedURL(url): string {
    var timestamp = String(Date.now());
    var baseMessage = this.user.accountRS + timestamp;
    var message = converters.stringToHexString(baseMessage);
    var secret = converters.stringToHexString(this.user.secretPhrase)
    var signature = heat.crypto.signBytes(message, secret);

    return [url, this.user.publicKey, timestamp, signature].join('/')
  }

  /* WebSocket.onclose */
  private onclose(event) {
    this.connected = false;
    if (this.autoReconnect) {
      this.connect(this.url);
    }
  }

  /* WebSocket.onopen */
  private onopen(event, deferred: angular.IDeferred<HeatSocket>) {
    this.connected = true;

    /* Send all pending messages */
    var pending = [].concat(this.pending_send);
    this.pending_send.length = 0;
    pending.forEach((argv) => {
      this.send(argv);
    });

    /* Re-subscribe to all topics */
    this.topics.forEach((topic) => {
      this.send(topic.subscribe());
    });

    deferred.resolve();
  }

  /* WebSocket.onerror */
  private onerror(event) {
    this.socket.close();
  }

  /* WebSocket.onmessage */
  private onmessage(event) {
    var message = event.data, data: any = null;
    try {
      data = JSON.parse(message);
      if (data.op == "response") {
        this.response(data.callId, data.data);
      }
      else if (data.op == "event") {
        this.notify(data.topic, data.params, data.data);
      }
      else {
        console.log('HeatSocket invalid datar', data);
      }
    }
    catch (e) {
      console.log('HeatSocket JSON parse error', message);
    }
  }

  /* Handles an RPC call response */
  private response(callId: string, data: any) {
    var rpc = this.rpc_callbacks[callId];
    if (rpc && !rpc.timedout) {
      rpc.done();
      var result = angular.isString(rpc.returns) ? data[rpc.returns] : data;
      rpc.deferred.resolve(result);
      delete this.rpc_callbacks[callId];
    }
  }

  /* Handles a push notification */
  private notify(topicName: string, params: IStringHashMap<string>, data: any) {
    var t = new HeatSocketTopic(topicName.toUpperCase(), params);
    var topic = this.topics.find((topic) => t.equals(topic));
    if (topic) {
      topic.listeners.forEach((cb) => {
        cb.call(null, data);
      })
    }
  }

  /**
   * Calls a method on the remote server.
   *
    * @param method String
    * @param params Object
    * @param returns String - top level property returned
    * @returns Promise
    **/
  public rpc(method: string, params: Object, returns?: string) : angular.IPromise<Object> {
    var deferred = this.$q.defer();
    var params = params || {};
    var rpc = new HeatSocketRPC(method, params, deferred, returns);
    this.rpc_callbacks[rpc.callId] = rpc;
    this.send(rpc.call());
    return deferred.promise;
  }
}