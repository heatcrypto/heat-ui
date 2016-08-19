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
  export function sendMessage($event, account?: string, bundle?: ReplicatorBundle): angular.IPromise<any> {

    return dialogs.dialog({
      id: 'sendMessage',
      title: 'Send message',
      controller: SendMessageDialogController,
      targetEvent: $event,
      cancelButton: true,
      locals: {
        account: account,
        bundle: bundle,
        hideRecipient: utils.emptyToNull(account) == null
      },
      template: `
        <div layout="column" flex>
          <div layout="row" flex ng-if="::!vm.account" layout-padding>
            <md-autocomplete
              flex
              md-min-length="1"
              md-items="item in vm.search(vm.searchText)"
              md-item-text="item.accountEmail || item.accountRS"
              md-search-text="vm.searchText"
              placeholder="Search recipient"
              md-selected-item-change="vm.searchSelectionChanged()"
              md-selected-item="vm.selectedAccount">
              <md-item-template>
                <span>{{item.accountEmail || item.accountRS}}</span>
              </md-item-template>
              <md-not-found>
                No matches found.
              </md-not-found>
            </md-autocomplete>
          </div>
          <div layout="row" flex ng-if="vm.account && !vm.hideRecipient" layout-padding>
            Recipient: {{ vm.cloudAccount.accountEmail }}
          </div>
          <div layout="column" flex layout-padding>
            <textarea ng-model="vm.message" flex rows="8" md-select-on-focus required></textarea>
            <input type="hidden" ng-model="vm.publicKey" required name="publickey">
          </div>
          <!--
          <md-switch ng-model="vm.archiveMessage" aria-label="Message type" ng-true-value="'blockchain'"
              ng-false-value="'no'" class="md-warn">
            Archive message: {{ vm.archiveMessage }}
          </md-switch>
          -->
        </div>
      `
    })
  }

  @Inject('$scope','cloud','user','sendmessage','settings')
  class SendMessageDialogController {

    public archiveMessage = 'blockchain';
    public message: string;
    public bundle: ReplicatorBundle;
    public account: string;
    public publicKey: string;
    okButtonLabel = "Send";

    searchText: string;
    selectedAccount: ICloudSearchAccountIdentifiersResponse = null;
    cloudAccount: ICloudAccount = null;

    constructor(private $scope: angular.IScope,
                private cloud: CloudService,
                private user: UserService,
                private sendmessage: SendmessageService,
                private settings: SettingsService) {
      if (utils.emptyToNull(this.account)) {
        cloud.api.getPublicKey(this.account).then((publicKey) => {
          $scope.$evalAsync(() => {
            this.publicKey = publicKey;
          })
        });
        cloud.api.getAccount(this.account).then((account) => {
          $scope.$evalAsync(() => {
            this.cloudAccount = account;
          })
        });
      }
    }

    okButtonClick($event) {
      if (this.archiveMessage == 'blockchain') {
        this.sendBlockchainMessage($event);
      }
      else {
        this.sendCloudMessage();
      }
    }

    sendCloudMessage() {
      var escaped = this.escape(this.message);
      var encrypted = heat.crypto.encryptMessage(escaped, this.publicKey, this.user.secretPhrase);
      var req: ICloudSaveMessageRequest = {
        senderRS: this.user.accountRS,
        recipientRS: this.account,
        isText: encrypted.isText,
        data: encrypted.data,
        nonce: encrypted.nonce
      }
      this.cloud.api.saveMessage(req).then(
        (result) => {
          dialogs.$mdDialog().hide();
        }
      );
    }

    sendBlockchainMessage($event) {
      var escaped = this.escape(this.message);
      this.sendmessage.dialog($event, this.account, this.publicKey, escaped, this.bundle).send();
    }

    escape(text: string) {
      return text.replace(/(?:\r\n|\r|\n)/g, '<br/>');
    }

    search(query: string) {
      var prefix = this.settings.get(SettingsService.RS_ADDRESS_PREFIX);
      query = query.replace(new RegExp('^'+prefix+'-'),'');
      var request: ICloudSearchAccountIdentifiersRequest = {
        accountColorId: this.user.accountColorId,
        requirePublicKey: true
      };
      return this.cloud.api.searchAccountIdentifiers(query, request);
    }

    searchSelectionChanged() {
      this.$scope.$evalAsync(() => {
        if (this.selectedAccount) {
          this.account = this.selectedAccount.accountRS;
          this.publicKey = this.selectedAccount.accountPublicKey;
        }
        else {
          this.account = null;
          this.publicKey = null;
        }
      });
    }
  }
}