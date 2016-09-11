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
@Component({
  selector: 'messageCollection',
  inputs: ['publickey','firstIndex','lastIndex','isLast'],
  styles: [`
    message-collection div.border-top {
      border-top-style: solid;
      border-top-width: 1px;
      border-top-color: #E0E0E0;
    }
    message-collection .individual-message {
      min-height: 100px;
      padding-top: 20px !important;
    }
  `],
  template: `
    <div layout="column" flex style="overflow:auto">
      <div ng-repeat="message in vm.messages" layout="column" class="individual-message" layout-padding id="{{message.id}}">
        <div class="border-top" layout="row">
          <span><b>{{message.sender}}</b></span>
          <span flex></span>
          <span>{{message.date}}</span>
        </div>
        <div><p>{{message.contents}}</p></div>
      </div>
    </div>
  `
})
@Inject('$scope','sendmessage','cloud','address','user','settings','$location', '$anchorScroll','engine')
class MessageCollectionComponent {

  /* @inputs */
  publickey: string;
  firstIndex: number;
  lastIndex: number;
  isLast: boolean;

  public messages: Array<ICloudMessage> = [];
  private refresh: any;

  constructor(private $scope: angular.IScope,
              private sendmessage: SendmessageService,
              private cloud: CloudService,
              private address: AddressService,
              private user: UserService,
              private settings: SettingsService,
              private $location: angular.ILocationService,
              private $anchorScroll: angular.IAnchorScrollService,
              private engine: EngineService) {

    var refresh = () => { this.loadData() };

    var topic = new TransactionTopicBuilder().account(this.user.account);
    var observer = engine.socket().observe<TransactionObserver>(topic).
      add(refresh).
      remove(refresh).
      confirm(refresh);

    $scope.$on("$destroy",() => { observer.destroy() });

    this.loadData();
  }

  loadData() {
    var request: ICloudGetMessagesRequest = {
      accountRS: heat.crypto.getAccountIdFromPublicKey(this.publickey),
      firstIndex: this.firstIndex,
      lastIndex: this.lastIndex,
      sortAsc: true,
      sortColumn: 'timestamp'
    }
    this.cloud.api.getMessages(request).then((messages) => {
      this.$scope.$evalAsync(() => {
        this.messages = messages.map((message) => {
          var date = utils.timestampToDate(message.timestamp);
          var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
          message['date'] = dateFormat(date, format);
          message['outgoing'] = this.user.accountRS == message.senderRS;
          message['contents'] = this.decryptMessage(message);
          return message;
        });

        // scroll to the last message but only if we are the last message collection
        if (this.isLast && this.messages.length) {
          this.$location.hash(this.messages[this.messages.length-1].id);
          this.$anchorScroll();
        }
      })
    })
  }

  decryptMessage(message: ICloudMessage) {
    if (message.recipientRS == this.user.accountRS) {
      return heat.crypto.decryptMessage(message.data, message.nonce, message.senderPublicKey, this.user.secretPhrase);
    }
    else if (message.senderRS == this.user.accountRS) {
      return heat.crypto.decryptMessage(message.data, message.nonce, message.recipientPublicKey, this.user.secretPhrase);
    }
    return "[Encrypted]";
  }
}