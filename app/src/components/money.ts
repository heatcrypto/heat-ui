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
  selector: 'money',
  inputs: ['@hideplusmin','@precision','amount','outgoing','@fraction','symbol'],
  template: `
    <b>
      <span ng-hide="vm.hideplusmin=='true'">{{vm.outgoing?'-':'+'}} </span>
      <span>{{ vm.amountFormatted }}</span>
    </b>&nbsp;<small>{{ vm.symbol }}</small>
  `
})
@Inject('$scope','user')
class Money {

  amount: string;
  amountNXT: string;
  amountFormatted: string;
  precision: string;
  outgoing: boolean;
  fraction: string;
  symbol: string;

  constructor($scope: angular.IScope, public user: UserService) {
    $scope.$watch(() => this.amount, () => { this.render() });
    this.render();
    this.symbol = this.symbol || this.user.accountColorName;
  }

  render() {
    /*
    var precision = this.precision ? parseInt(this.precision) : 8;
    this.amountNXT = utils.convertNQT(this.amount, precision);
    var fraction = this.fraction ? parseInt(this.fraction) : 0;
    if (fraction) {
      this.amountNXT = utils.roundTo(this.amountNXT, fraction);
    }
    */
    this.amountFormatted = utils.formatQNT(this.amount,parseInt(this.precision));
  }
}