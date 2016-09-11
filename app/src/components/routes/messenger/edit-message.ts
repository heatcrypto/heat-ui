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
  selector: 'editMessage',
  inputs: ['publickey'],
  styles: [`
    edit-message .messenger-editor {
      height: 160px;
      min-height: 160px;
    }
  `],
  template: `
    <div layout="column" layout-fill flex>
      <div layout="row">
        <md-button ng-click="vm.showEditor=true" ng-if="!vm.showEditor">Reply</md-button>
      </div>
      <div layout="column" flex ng-if="vm.showEditor" class="messenger-editor">
        <div layout="row">
          <md-button class="md-primary" ng-click="vm.sendMessage($event)" ng-disabled="!vm.messageText">Send Message</md-button>
          <md-button ng-click="vm.showEditor=false; vm.messageText=''">Cancel</md-button>
        </div>
        <textarea ng-model="vm.messageText" flex></textarea>
      </div>
    </div>
  `
})
@Inject('$scope','sendmessage','cloud','address')
class EditMessageComponent {

  /* @inputs */
  publickey: string;

  private showEditor = false;
  private messageText: string;

  constructor(private $scope: angular.IScope,
              private sendmessage: SendmessageService,
              private cloud: CloudService,
              private address: AddressService) {}

  sendMessage($event) {
    var account = heat.crypto.getAccountIdFromPublicKey(this.publickey);
    var accountRS = this.address.numericToRS(account);
    this.sendmessage.
         dialog($event, accountRS, this.publickey, this.messageText).
         send().
         then(() => {
      this.$scope.$evalAsync(() => {
        this.showEditor = false;
        this.messageText = '';
      });
    });
  }
}