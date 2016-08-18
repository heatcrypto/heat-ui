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
interface ISocket {

  /* Connects to the server socket */
  connect(url: string, fallback?: string[]): angular.IPromise<ISocket>;

  /* Closes the socket - not to be auto-reconnected anymore */
  close();

  /* Sends a JSON object through the socket to the server */
  send(object: Object): boolean;

  /* Subscribe to a server event topic, provide a $scope to have it unsubscribe on $scope destroy */
  subscribe(topic:string, callback:Function, $scope?:angular.IScope);

  /* Unsubscribe from a server event topic */
  unsubscribe(topic:string, callback:Function);

  /* Call a RPC method on the server */
  rpc(method:string, argv:Object, returns?: string): angular.IPromise<Object>;

  /* Helper (calls rpc internally) */
  callAPIFunction(name:string, argv?:Object, returns?: string): angular.IPromise<any>;

  /* Helper to access HTTP API endpoints */
  api: ISocketAPI;

  /* Creates a managed transaction observer */
  observe<T>(topic: ITopicBuilder): T;
}