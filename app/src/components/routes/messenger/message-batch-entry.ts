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
    message-batch-entry .outgoing {
      text-align: right;
    }
    message-batch-entry .incoming {
      text-align: left;
    }
    message-batch-entry .batch-entry {
      padding-left: 0px;
    }
    message-batch-entry .message-content {
      font-size: 16px;
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
  `],
  template: `
    <div ng-class="vm.io">
      <div class="header">
        {{::vm.message.date}}
      </div>
      <div class="message-content"><pre>{{vm.message.contents}}</pre></div>
    </div>
  `
})
class MessageBatchEntryComponent {
  message: IHeatMessage; // @input
  io: string;
  constructor() {
    this.io = this.message['outgoing'] ? 'outgoing' : 'incoming';
  }
}
