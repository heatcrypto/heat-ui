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
@RouteConfig('/messenger/:publickey')
@Component({
  selector: 'messenger',
  inputs: ['publickey'],
  styles: [`
    messenger user-contacts {
      width: 300px;
      min-width: 240px;
    }
    messenger edit-message {
      min-height: 80px;
    }
    messenger .outer-container {
      padding-top: 0px;
      padding-bottom: 0px;
    }
    messenger md-content {
      padding-top: 2px;
    }
    messenger .progress-indicator {
      padding-left: 0px;
      padding-right: 0px;
    }
    messenger md-progress-linear > .md-container {
      height: 3px;
      max-height: 3px;
    }
    messenger .edit-message {
      padding-right: 0px;
    }
  `],
  template: `
    <div layout="column" flex layout-padding layout-fill class="outer-container">
      <div layout="row" flex layout-fill>
        <div layout="column">
          <user-contacts flex layout="column" ></user-contacts>
          <md-button class="md-fab md-primary" aria-label="Add contact" ng-click="vm.showSendmessageDialog($event)">
            <md-tooltip md-direction="top">
              Send message to new contact
            </md-tooltip>
            <md-icon md-font-library="material-icons">add_circle_outline</md-icon>
          </md-button>
        </div>
        <div layout="column" layout-fill>
          <div class="row" class="progress-indicator" flex ng-show="vm.loading">
            <md-progress-linear class="md-primary" md-mode="indeterminate"></md-progress-linear>
          </div>
          <md-content flex id="message-batch-container">
            <message-batch-viewer flex layout="column" container-id="message-batch-container"
                    publickey="::vm.publickey"></message-batch-viewer>
          </md-content>
          <div layout="column" flex="none" class="edit-message">
            <edit-message publickey="vm.publickey" layout="row" flex></edit-message>
          </div>
        </div>
      </div>
    </div>
  `
})
@Inject('$scope','user','sendmessage')
class MessengerComponent {

  publickey: string; // @input
  loading: boolean;

  constructor(private $scope: angular.IScope,
              private user: UserService,
              private sendmessage: SendmessageService) {
    user.requireLogin();
  }

  showSendmessageDialog($event) {
    this.sendmessage.dialog($event).show();
  }
}
