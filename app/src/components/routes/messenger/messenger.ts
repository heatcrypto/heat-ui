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
  template: `
    <div layout="column" flex layout-fill>
      <md-content flex layout="column" flex layout-fill>
        <message-collection publickey="vm.publickey" first-index="0" last-index="100" is-last="true"
          layout="column" flex></message-collection>
      </md-content>
      <div layout="column" layout-padding>
        <edit-message publickey="vm.publickey" flex layout="column"></edit-message>
      </div>
    </div>
  `
})
@Inject('$scope','user','engine','cloud')
class MessengerComponent {

  /* @inputs */
  publickey: string;

  constructor(private $scope: angular.IScope,
              private user: UserService,
              private engine: EngineService,
              private cloud: CloudService) {}
}