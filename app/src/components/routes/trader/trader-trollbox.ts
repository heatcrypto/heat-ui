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
  selector: 'traderTrollbox',
  template: `
    <div layout="column" layout-fill>
      <div layout="row" class="trader-component-title">Trollbox&nbsp;
        <span flex></span>
        <elipses-loading ng-show="vm.loading"></elipses-loading>
      </div>
      <md-list flex layout-fill layout="column">
        <md-virtual-repeat-container flex layout-fill layout="column"
            virtual-repeat-flex-helper ng-if="vm.balances.length>0">
          <md-list-item md-virtual-repeat="item in vm.balances">
            <div class="truncate-col symbol-col">{{item.symbol}}</div>
            <div class="truncate-col balance-col" flex>{{item.balance}}</div>
          </md-list-item>
        </md-virtual-repeat-container>
      </md-list>
      <div layout="row">
        <textarea rows="6" disabled placeholder="Troll"></textarea>
      </div>
    </div>
  `
})
class TraderTrollboxComponent {
  constructor() {}
}