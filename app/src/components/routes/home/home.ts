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
@RouteConfig('/home')
@Component({
  selector: 'home',
  template: `
    <div layout="column" flex layout-padding layout-fill>
      <div layout="column">
        <div layout="column" layout-gt-sm="row">
          <div layout="column">
            <user-balance class="md-display-2"></user-balance>
          </div>
          <div flex hide show-gt-sm></div>
          <div layout="column">
            <span class="md-subhead"><small>Account: </small></span>
            <div layout="row" layout-align="start center">
              <span id="home-user-id">{{ vm.user.account }}</span>&nbsp;<copy-text element-id="home-user-id" message="Copied Account Id"></copy-text>
            </div>
          </div>
        </div>
      </div>
      <div layout="column" flex layout-fill>
        <user-payments-table flex layout-fill></user-payments-table>
      </div>
    </div>
  `
})
@Inject('$scope','user','cloud')
class HomeComponent {

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private cloud: CloudService) {
  }
}