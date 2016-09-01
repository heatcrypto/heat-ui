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
@RouteConfig('/claim')
@Component({
  selector: 'claim',
  styles: [`
    claim .md-button {
      padding-top: 18px;
      padding-bottom: 18px;
      padding-left: 30px;
      padding-right: 30px;
    }
  `],
  template: `
    <div layout="column" flex layout-align="start center">
      <p class="md-display-1">Claim HEAT ICO Tokens</p>
      <p ng-hide="vm.participates">Please complete the form below to claim your HEAT ICO Tokens</p>
      <p ng-show="vm.participates">Please click the button to continue</p>
      <div layout="column" flex ng-hide="vm.participates">
        <form name="claimForm">
          <div layout="column" flex style="width:380px">
            <md-input-container>
              <label>ICO Source</label>
              <md-select ng-model="vm.source" ng-change="vm.sourceChanged();" required ng-disabled="vm.participates">
                <md-option value=""></md-option>
                <md-option value="BTC">BTC</md-option>
                <md-option value="ETH">ETH</md-option>
                <md-option value="FIMK">FIMK</md-option>
                <md-option value="NXT">NXT</md-option>
              </md-select>
            </md-input-container>
            <md-input-container flex ng-show="vm.source">
              <label>{{vm.source}}&nbsp;Address</label>
              <input ng-model="vm.address" required name="address" maxlength="300" ng-disabled="vm.participates">
            </md-input-container>
            <md-input-container flex>
              <center>
                <md-button class="md-raised md-primary" ng-disabled="claimForm.$invalid || vm.participates"
                  ng-click="vm.continue($event)">Continue</md-button>
              </center>
            </md-input-container>
            <p ng-if="vm.noParticipant">The address you provided does not seem to participate in the ICO</p>
            <p ng-if="vm.checkingParticipates">Checking to see if this address participates&nbsp;<elipses-loading></elipses-loading></p>
          </div>
        </form>
      </div>
      <div layout="column" flex ng-show="vm.participates">
        <center>
          <md-button class="md-raised md-primary" ng-disabled="!vm.participates"
            ng-click="vm.beginVerification($event)">Click to begin verification process</md-button>
        </center>
      </div>
    </div>
  `
})
@Inject('$scope','user','cloud','$q','$timeout')
class ClaimComponent {

  private source: string = "";
  private address: string = "";
  private participates: boolean = false;
  private noParticipant: boolean = false;
  private checkingParticipates: boolean = false;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private cloud: CloudService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService) {
  }

  sourceChanged() {
    this.address = "";
  }

  beginVerification() {

  }

  continue() {
    this.$scope.$evalAsync(() => { this.checkingParticipates = true });
    this.addressParticipatedInICO().then((participates) => {
      this.$scope.$evalAsync(() => {
        this.checkingParticipates = false;
        this.participates = participates;
      });
    });
  }

  addressParticipatedInICO(): angular.IPromise<boolean> {
    var deferred = this.$q.defer();
    this.$timeout(3000, true).then(() => {
      deferred.resolve(true);
    });
    return deferred.promise;
  }
}