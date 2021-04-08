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
  selector: 'messageBatchEntry',
  inputs: ['message'],
  styles: [`
    message-batch-entry .header {
      font-size: 12px;
    }
    message-batch-entry .batch-entry {
      padding-left: 0px;
    }
    message-batch-entry .message-content {
      font-size: 16px;
    }
    message-batch-entry .status {
      font-size: 12px;
      float: right;
      margin-left: 7px;
      margin-right: -12px;
    }
    message-batch-entry .column {
      border-radius: 15px;
      min-width: 120px;
      padding-top: 5px;
    }
    message-batch-entry .outgoing {
      float: right;
      background-color: #0c5f68;
      color: white;
      padding-left: 10px;
      padding-top: 10px;
      padding-right: 10px;
      padding-bottom: 0px;
      border-radius: .4em;
      max-width: 75%;
      min-width: 20%;
    }
    message-batch-entry .incoming {
      text-align: left;
      float: left;
      background-color: #52a7b1;
      color: black;
      padding-left: 10px;
      padding-top: 10px;
      padding-right: 10px;
      padding-botton: 0px;
      border-radius: .4em;
      max-width: 75%;
      min-width: 20%;
    }
    message-batch-entry .message-content pre {
      white-space: pre-wrap;       /* Since CSS 2.1 */
      white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
      white-space: -pre-wrap;      /* Opera 4-6 */
      white-space: -o-pre-wrap;    /* Opera 7 */
      word-wrap: break-word;       /* Internet Explorer 5.5+ */
      /* Adds a hyphen where the word breaks, if supported (No Blink) */
      -ms-hyphens: auto;
      -moz-hyphens: auto;
      -webkit-hyphens: auto;
      hyphens: auto;
    }
    message-batch-entry .offchain {
      border-left: solid 7px green;
    }
    message-batch-entry .onchain, message-batch-entry .chain {
      border-left: solid 7px #ff3301;
    }
    message-batch-entry .p2p {
      border-left: solid 7px green;
    }
    message-batch-entry .server {
      border-left: solid 7px skyblue;
    }
  `],
  template: `
    <div class="{{vm.message.transport}}" ng-class="{'outgoing': vm.message.outgoing, 'incoming': !vm.message.outgoing}">
      <div class="header">
        <span>{{vm.message.date}}</span>
        <!-- delivered icon, stage == 1 means Delivered -->
        <md-icon class="status" md-font-library="material-icons" ng-if="vm.stage==1">check</md-icon>
      </div>
      <div ng-if="!vm.linkToFile" class="message-content"><pre>{{vm.text}}</pre></div>
      <div ng-if="vm.linkToFile" class="message-content">
        <pre>{{vm.text}}</pre>
        <p><a class="md-primary md-button md-ink-ripple" ng-click="vm.downloadFile()">download</a></p>
      </div>
    </div>
  `
})
@Inject('$rootScope', '$scope', 'P2PMessaging')
class MessageBatchEntryComponent {
  message: any; // @input
  io: string;
  stage: number
  text: string
  linkToFile: string

  constructor(private $rootScope: angular.IScope,
              private $scope: angular.IScope,
              private messaging: P2PMessaging) {
    $rootScope.$on('OFFCHAIN_MESSAGE_EXTRA_INFO', (event, msgId: string, info: p2p.MessageExtraInfo) => {
      if (this.message.msgId == msgId) {
        this.$scope.$evalAsync(() => {
          this.message.extraInfo = info
          this.stage = this.message.extraInfo ? this.message.extraInfo.status.stage : null
        })
      }
    });
  }

  $onInit() {
    this.io = this.message['outgoing'] ? 'outgoing' : 'incoming'
    this.stage = this.message.extraInfo ? this.message.extraInfo.status.stage : null
    if (!this.message.type || this.message.type == "chat") {
      this.text = this.message.contents
    } else if (this.message.type == "file") {
      let s: string = this.message.contents
      let delimiterPos = s.indexOf("|")
      if (delimiterPos > 0) {
        let fileSize = parseInt(s.substr(0, delimiterPos))
        let fileName = s.substr(delimiterPos + 1).trim()
        if (this.io == 'incoming') {
          this.text = `file "${fileName}", size ${fileSize} bytes`
          //link to file
          this.linkToFile = "todo"
        } else {
          this.text = `file sent "${fileName}", size ${fileSize} bytes`
        }
      }
    }
  }

  //send request to server to download the file
  downloadFile() {
    this.messaging.u2uProtocol.requestFile(this.message.msgId, this.message.fromPeer)
  }

}
