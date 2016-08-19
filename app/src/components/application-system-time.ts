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
  selector: 'applicationSystemTime',
  template: `
  <span>{{vm.time}}</span>
  `
})
@Inject('settings','$scope','$interval')
class ApplicationSystemTimeComponent {
  time: string = '           ';

  constructor(private settings: SettingsService,
              private $scope: angular.IScope,
              $interval: angular.IIntervalService) {

    var interval = $interval(() => this.update(), 1000, 0, false);
    $scope.$on('$destroy', () => { $interval.cancel(interval) });
    this.update();
  }

  update() {
    this.$scope.$evalAsync(() => {
      this.time = dateFormat(new Date(), this.settings.get(SettingsService.DATEFORMAT_DEFAULT))
    });
  }
}