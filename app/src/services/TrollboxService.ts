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
interface TrollboxServiceMessage {
  username: string;
  text: string;
}
interface SlackMessageEvent {
  type: string;   // "message",
  user: string;   // "U4092L18X",
  text: string;
  ts: string;     // "1494455657.040443",
  channel: string;// "C5C4GPU9M",
}

@Service('trollbox')
@Inject('$rootScope','heat','user')
class TrollboxService {

  /* Trollbox backend is located on testnet server */
  private host = "https://heatwallet.com";
  private port = 7734;
  private wss  = "wss://heatwallet.com:7755/ws/";
  // private telegram_trollbox_host = "http://185.40.76.143";
  // private telegram_trollbox_port = 7733;
  // private wss  = "ws://185.40.76.143:7755/ws/";
  private subscriber: HeatSubscriber;

  public name: string;
  constructor(private $rootScope: angular.IRootScopeService,
              private heat: HeatService,
              private user: UserService) {
    /* Since using custom websocket endpoint we must manually create our subscriber */
    this.subscriber = heat.createSubscriber(this.wss);
  }

  public join(name: string) {
    this.name = name;
  }

  public getMessages(): angular.IPromise<Array<TrollboxServiceMessage>>[] {
    let fromTelegram = this.heat.getRaw(this.host, this.port, '/microservice/telegram-trollbox/messages');
    let fromSlack = this.heat.getRaw(this.host, this.port, '/microservice/trollbox/messages');
    return [fromTelegram, fromSlack];
  }

  public sendMessage(message: string) {
    this.heat.postRaw(this.host, this.port, '/microservice/telegram-trollbox/send', {
      username: this.name,
      message: message,
      publicKey: this.user.publicKey,
      signature: heat.crypto.signBytes(converters.stringToHexString("hello"), converters.stringToHexString(this.user.secretPhrase))
    });
    return this.heat.postRaw(this.host, this.port, '/microservice/trollbox/send', {
      username: this.name,
      message: message,
      publicKey: this.user.publicKey,
      signature: heat.crypto.signBytes(converters.stringToHexString("hello"), converters.stringToHexString(this.user.secretPhrase))
    });
  }

  public subscribe(callback: (event:TrollboxServiceMessage)=>void, $scope:angular.IScope): ()=>void {
    return this.subscriber.microservice({'microservice':'trollbox.service'}, callback, $scope);
  }

}
