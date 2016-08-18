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
    this.description = data['errorDescription'] || data['error'];
    this.code = data['errorCode'] || -1;
  }
}

class InternalServerTimeoutError extends ServerEngineError {
  constructor() {
    super({ error: 'Internal timeout' });
  }
}

class Socket implements ISocket {

  constructor(private $q, private $timeout, private settings: SettingsService) {}

  static call_id: number = 0;

  public connected: boolean = false;
  public api: ISocketAPI = new SocketAPI(this);

  private socket: WebSocket;
  private pending_send: Object[] = [];
  private url: string;
  private pool:URLPool;
  private closed: boolean = false;
  private topics: string[] = [];
  private deferredOnOpen = null;
  private rpc_callbacks = [];

  private CONNECTING: number = 0;
  private CONNECTED: number = 1;
  private CLOSING: number = 2;
  private CLOSED: number = 3;
  private RECONNECT_DELAY = this.settings.get(SettingsService.SOCKET_RECONNECT_DELAY);
  private MAX_TIMEOUT = this.settings.get(SettingsService.SOCKET_RPC_TIMEOUT);

  private trace(topic: string, data: Object) {
    console.log('WEBSOCKET ['+topic+']',data);
  }

  /* Sends a JSON object through the socket to the server */
  public send(argv: Object): boolean {
    if (this.socket && this.socket.readyState == 1) {
      this.trace('sending', argv);
      this.socket.send(JSON.stringify(argv));
      return true;
    }

    this.pending_send.push(argv);
    this.maybe_connect();
    return false;
  }

  private maybe_connect() {
    if (!this.socket || this.socket.readyState == this.CLOSED) {
      if (!this.closed) {
        this.connect();
      }
    }
    else if (this.socket.readyState == this.CLOSING) {
      this.socket.onclose = () => this.maybe_connect();
    }
  }

  public close() {
    this.closed = true;
    if (this.socket) {
      this.socket.close();
    }
  }

  public connect(url?: string, fallback?:string[]): angular.IPromise<ISocket> {
    if (angular.isDefined(url)) {
      this.url = url;
    }
    if (angular.isDefined(fallback)) {
      this.pool = new URLPool([url].concat(fallback));
    }

    /* Appearantly the previous connection did not succeed, it neither opened or clossed */
    if (this.deferredOnOpen) {
      this.deferredOnOpen.reject();
      this.deferredOnOpen = null;
    }

    /* We keep this around until either onopen where we resolve or until onclose where we reject */
    this.deferredOnOpen = this.$q.defer();

    if (this.socket) {

      /* Make sure an old socket does not have any of it's callbacks called */
      this.socket.onclose = this.socket.onopen = this.socket.onerror = this.socket.onmessage = null;

      /* Close connection, reconnect when onclose is called */
      if (this.socket.readyState == this.CONNECTING || this.socket.readyState == this.CONNECTED || this.socket.readyState == this.CLOSING) {
        this.socket.onclose = () => {
          this.socket = null;
          this.connected = false;
          this.connect(url);
        }
        /* Call close unless we are already closing */
        if (this.socket.readyState != this.CLOSING) {
          this.trace('closing', this.url);
          this.socket.close();
        }
        return;
      }
    }

    var _url = url || this.url;
    this.socket = new WebSocket(_url);
    this.socket.onclose = (event) => this.onclose(event);
    this.socket.onopen = (event) => this.onopen(event);
    this.socket.onerror = (event) => this.onerror(event);
    this.socket.onmessage = (event) => this.onmessage(event);

    return this.deferredOnOpen.promise;
  }

  private onclose(event) {
    this.trace('onclose', event);
    this.connected = false;
    if (this.deferredOnOpen) {
      this.deferredOnOpen.reject();
      this.deferredOnOpen = null;
    }
    if (!this.closed) {
      this.$timeout(() => this.connect(), this.RECONNECT_DELAY, false);
    }
  }

  private onopen(event) {
    this.trace('onopen', event);
    this.connected = true;
    if (this.deferredOnOpen) {
      this.deferredOnOpen.resolve(this);
      this.deferredOnOpen = null;
    }

    /* Re-subscribe to all topics */
    for (var i=0; i<this.topics.length; i++) {
      this.send(['subscribe', this.topics[i]]);
    }

    /* Send all pending messages */
    var pending = [].concat(this.pending_send);
    this.pending_send.length = 0;
    for (var i=0; i<pending.length; i++) {
      this.send(pending[i]);
    }
  }

  private onerror(event) {
    this.trace('onerror', event);
    if (this.pool) {
      this.pool.bad(this.url);
      this.url = this.pool.next();
    }
    this.socket.close();
  }

  private onmessage(event) {
    this.trace('onmessage', event);
    var message = event.data;
    if (message == "pong" || !message) {
      return
    }
    try {
      var data = JSON.parse(message);
    }
    catch (e) {
      console.log('JSON parse error', message);
      return;
    }
    if (!Array.isArray(data)) {
      console.log('Expected an array', message);
      return;
    }

    var op = data[0];
    if (op == "response") {
      this.response(data[1], data[2]);
    }
    else if (op == "notify") {
      this.notify(data[1], data[2]);
    }
    else {
      console.log('Unsupported operation', message);
    }
  }

  public subscribe(topic:string, callback:Function) {
    topic = topic.toUpperCase();
    this.trace('subscribe', topic);

    var topics = this.topics[topic] || (this.topics[topic] = []);
    for (var i=0; i<topics.length; i++) {
      if (topics[i] === callback) {
        console.log('Ignoring dublicate socket subscription', topic);
        return;
      }
    }

    if (topics.length == 0) {
      this.send(['subscribe', topic]);
    }
    topics.push(callback);
    return () => this.unsubscribe(topic, callback);
  }

  public unsubscribe(topic:string, callback:Function) {
    topic = topic.toUpperCase();
    var topics = this.topics[topic];
    if (topics) {
      this.topics[topic] = topics.filter((cb) => cb !== callback);
      if (this.topics[topic].length == 0) {
        delete this.topics[topic];
        this.send(['unsubscribe', topic]);
      }
    }
  }

  /* Handles an RPC call response */
  private response(callId: string, data: any) {
    var cb = this.rpc_callbacks[callId];
    if (cb) {
      var deferred = cb.deferred;
      this.$timeout.cancel(cb.timeout);
      if (angular.isDefined(data.errorDescription) || angular.isDefined(data.error) || angular.isDefined(data.errorCode)) {
        this.logErrorResponse(this.rpc_callbacks[callId], data);
        deferred.reject(new ServerEngineError(data));
      }
      else {
        this.logResponse(this.rpc_callbacks[callId], data);
        var result = angular.isString(cb.returns) ? data[cb.returns] : data;
        deferred.resolve(result);
      }
      delete this.rpc_callbacks[callId];
    }
  }

  /* Handles a push notification */
  private notify(topic: string, data: Object) {
    var listeners = this.topics[topic];
    this.logNotify(topic, data, listeners);
    if (listeners) {
      for (var i=0; i<listeners.length; i++) {
        if (typeof listeners[i] == 'function') {
          listeners[i].call(null, data);
        }
        else {
          console.log('Listener '+i+' of '+topic+' is not a function');
        }
      }
    }
  }

  /**
   * Calls a method on the remote server.
   *
    * @param method String
    * @param argv Object
    * @param returns String - top level property returned
    * @returns Promise
    **/
  public rpc(method: string, argv: Object, returns?: string) : angular.IPromise<Object> {
    var deferred = this.$q.defer();
    var callId = String(Socket.call_id++);
    var socket_args = ['call', callId, method, argv||{}];

    this.rpc_callbacks[callId] = {
      start: Date.now(),
      argv: argv,
      returns: returns,
      deferred: deferred,
      timeout:  this.$timeout(() => {

        var deferred = this.rpc_callbacks[callId].deferred;
        delete this.rpc_callbacks[callId];
        deferred.reject(new InternalServerTimeoutError());

      }, this.MAX_TIMEOUT, false)
    };
    this.send(socket_args);
    return deferred.promise;
  }

  public callAPIFunction(name:string, argv:Object, returns?: string): angular.IPromise<Object> {
    argv = argv || {};
    argv['requestType'] = name;

    /* API functions need "true" instead of true and "false" instead of false */
    angular.forEach(argv, (value, name) => {
      if (typeof(value) == 'boolean') {
        argv[name] = value ? 'true' : 'false';
      }
    });
    return this.rpc('callAPIFunction', argv, returns);
  }

  observe(topic: ITopicBuilder) {
    var observer: ITopicObserver;
    switch (topic.id) {
      case TransactionObserver.id:
        observer = new TransactionObserver();
        break;
      case ExchangeObserver.id:
        observer = new ExchangeObserver();
        break;
    }
    observer.destroy = this.subscribe(topic.topic(), (data) => { observer.observe(data) });
    return observer;
  }

  private logErrorResponse(rpc_callback: any, data) {
    if (this.settings.get(SettingsService.LOG_API_ERRORS) || this.settings.get(SettingsService.LOG_API_ALL)) {
      console.error('SOCKET ['+rpc_callback.argv.requestType+']', {
        request: rpc_callback.argv,
        response: data,
        duration: ((Date.now() - rpc_callback.start)/1000)+' seconds'
      });
    }
  }

  private logResponse(rpc_callback: any, data) {
    if (this.settings.get(SettingsService.LOG_API_ALL)) {
      console.log('SOCKET ['+rpc_callback.argv.requestType+']', {
        request: rpc_callback.argv,
        response: data,
        duration: ((Date.now() - rpc_callback.start)/1000)+' seconds'
      });
    }
  }

  private logNotify(topic: string, data: Object, listeners: any) {
    if (this.settings.get(SettingsService.LOG_NOTIFY_ALL)) {
      if (listeners && listeners.length) {
        console.log('NOTIFY ('+listeners.length+') ['+topic+']', data);
      }
      else {
        console.log('NOTIFY (no listeners) ['+topic+']', data);
      }
    }
  }

}