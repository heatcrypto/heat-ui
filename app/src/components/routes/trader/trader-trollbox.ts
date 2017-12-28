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
  selector: 'traderTrollbox',
  template: `
    <div layout="column" flex layout-fill>
      <div class="trader-component-title">Trollbox&nbsp;
        <elipses-loading ng-show="vm.loading"></elipses-loading>
        <a href="https://t.me/joinchat/Bs91sA3agGFXqLaZwWMogg" target="_blank">Join Telegram!
          <md-tooltip md-direction="bottom">
            This trollbox is connected to our Telegram #trollbox channel, post either here or on #trollbox and chat in realtime.
          </md-tooltip>
        </a>
<!--
        <a href="https://heat-slack.herokuapp.com" target="_blank">Join Slack!
          <md-tooltip md-direction="bottom">
            This trollbox is connected to our Slack #trollbox channel, post either here or on #trollbox and chat in realtime.
          </md-tooltip>
        </a>
-->
      </div>
      <div layout="row">
        <div flex>
          <input type="text" placeholder="Type your name here" ng-model="vm.name"
                  ng-disabled="!vm.user.unlocked"></input>
        </div>
        <div>
          <button class="md-primary md-button md-ink-ripple" ng-click="vm.joinChat()" ng-disabled="!vm.name || vm.trollbox.name">Join</button>
        </div>
      </div>
      <div layout="column" flex>
        <ul class="display" scroll-glue>
          <li ng-repeat="item in vm.messages">
            <span><a ng-if="item.account" href="#/explorer-account/{{item.account}}/transactions">{{item.name}}</a>
            <b ng-if="!item.account">{{item.username}}</b>: {{item.text}}</span>
          </li>
        </ul>
      </div>
      <div layout="row">
        <textarea rows="2" ng-keypress="vm.onTextAreaKeyPress($event)"
          ng-disabled="!vm.user.unlocked || !vm.trollbox.name"
          placeholder="ENTER to send, SHIFT+ENTER for new line" ng-model="vm.messageText"></textarea>
      </div>
    </div>
  `
})
@Inject('$q', '$scope','trollbox','$timeout','user')
class TraderTrollboxComponent {
  private name: string;
  private messageText: string;
  public messages: Array<TrollboxServiceMessage> = [];
  private nameRegexp = /^(.+)\s\[(\d+)\]$/;

  constructor(public $q: angular.IQService,
              private $scope: angular.IScope,
              private trollbox: TrollboxService,
              private $timeout: angular.ITimeoutService,
              private user: UserService) {

    // do not use  $q.all(trollbox.getMessages())  because some promise may be rejected, so get messages sequentially
    trollbox.getMessages().forEach(promise => {
      promise.then((messages) => {
      $scope.$evalAsync(() => {
          console.log('messages', messages);
          let ar = messages.map(message => {
          return this.augmentMessage(message);
        });
          this.messages = this.messages.concat(ar);
          console.log('this messages', this.messages);
        });
      });
    });

    trollbox.subscribe((event)=> {
      $scope.$evalAsync(() => {
        if (angular.isObject(event) && angular.isString(event.username) && angular.isString(event.text)) {
          if (event.username.length > 0 && event.text.length > 0) {
            this.messages.push(this.augmentMessage(event));
          }
        }
      });
    }, $scope);

    if (angular.isString(user.accountName)) {
      this.name = user.accountName.replace(/@heatwallet.com$/,"");
    }
  }

  augmentMessage(message:TrollboxServiceMessage) {
    if (message.username) {
      let match = message.username.match(this.nameRegexp);
      if (match) {
        message['name'] = match[1];
        message['account'] = match[2];
      }
    }
    try {
      message['text'] = decodeURIComponent(message['text']);
    } catch (e) {}
    return message;
  }

  joinChat() {
    this.trollbox.join(this.name);
  }

  onTextAreaKeyPress($event: KeyboardEvent) {
    if ($event.keyCode == 13 && !$event.shiftKey && utils.emptyToNull(this.messageText)) {
      this.trollbox.sendMessage(this.messageText);
      this.$scope.$evalAsync(()=>{
        this.messageText = null;
      })
    }
  }
}
