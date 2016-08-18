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
class CloudSocketRPC {

  static call_id: number = 0;
  public callId: string;
  public timedout: boolean = false;
  private start: number;
  private timeout: any;
  private $timeout: angular.ITimeoutService;

  constructor(public method: string,
              public params: Object,
              public deferred: angular.IDeferred<Object>,
              public returns?: string) {

    this.callId = String(CloudSocketRPC.call_id++);
    this.start = Date.now();

    var settings = <SettingsService> heat.$inject.get('settings');
    this.$timeout = <angular.ITimeoutService> heat.$inject.get('$timeout');
    var max = settings.get(SettingsService.CLOUD_RPC_TIMEOUT);

    this.timeout = this.$timeout(() => {
      this.timedout = true;
      deferred.reject(new CloudInternalServerTimeoutError());
    }, max, false);

    deferred.promise.then(() => {
      this.$timeout.cancel(this.timeout);
    });
  }

  public call() {
    return {
      op: "call",
      data: {
        method: this.method,
        callId: this.callId,
        params: this.params
      }
    }
  }

  public done() {
    this.$timeout.cancel(this.timeout);
  }
}