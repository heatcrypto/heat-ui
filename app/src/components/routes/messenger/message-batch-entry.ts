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
    message-batch-entry md-icon {
      padding: 0 13px 7px 0;
      font-size: 32px !important;
    }
    message-batch-entry .header {
      font-size: 15px;
    }
    message-batch-entry .batch-entry {
      padding-left: 0px;
    }
    .offchain {
      color: deepskyblue;
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
  `],
  template: `
    <div layout="row" flex layout-align="start start" layout-padding class="batch-entry">
      <div layout="column">
        <md-icon md-font-library="material-icons" ng-class="{offchain: vm.offchain}">{{::vm.icon}}</md-icon>
        <span ng-if="vm.offchain" class="offchain">offchain</span>
      </div>
      <div layout="column" flex layout-padding>
        <div layout="row" class="header">
          <b ng-if="!vm.message.outgoing">{{vm.message.sender}}&nbsp;&nbsp;&nbsp;&nbsp;</b>{{::vm.message.date}}
        </div>
        <!-- look into allowing html messages later on
        <div layout="column" class="message-content" ng-bind-html="vm.message.html"></div>
        -->
        <div layout="column" class="message-content"><pre>{{vm.message.contents}}</pre></div>
      </div>
    </div>
  `
})
//@Inject('$scope','$q','$timeout')
class MessageBatchEntryComponent {
  message: IHeatMessage; // @input
  icon: string;
  offchain: boolean;
  constructor() {
    this.icon = this.message['outgoing'] ? 'chat_bubble_outline' : 'comment';
    this.offchain = !!this.message['p2p'];
  }
}
