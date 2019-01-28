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
module dialogs {

  export function textEditor(title, content, saveContentFunc) {
    dialogs.dialog({
      id: 'textEditor',
      title: title,
      //targetEvent: $event,
      okButton: false,
      cancelButton: false,
      locals: {
        save: function() {
          saveContentFunc(this.content);
          $mdDialog().hide();
        },
        close: function() {
          $mdDialog().hide();
        },
        content: content
      },
      template: `
        <!--<md-input-container flex>-->
        <p>
          <textarea rows="20" ng-model="vm.content" id="content-textarea"></textarea>
        </p>
        <!--</md-input-container>-->
        <div layout="row" layout-align="center center" style="min-height: 25px">
          <md-button class="md-primary" ng-click="vm.save()">Save</md-button>
          <md-button class="md-primary" ng-click="vm.close()">Close</md-button>
        </div>
      `,
      style: `
        #content-textarea {
            width: 100%;
        }
      `
    })
  }

}
