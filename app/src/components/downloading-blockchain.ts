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
  selector: 'downloadingBlockchain',
  template: `
    <div layout="column" flex layout-fill ng-show="vm.showComponent">
      <md-progress-linear md-mode="indeterminate"></md-progress-linear>
      <center><div><b>Attention!!</b></div>
      <div>Downloading blockchain last block height: {{vm.lastBlockHeight}}, time {{vm.lastBlockTime}}</div></center>
    </div>
  `
})
@Inject('$scope','heat','$interval','settings')
class DownloadingBlockchainComponent {
  showComponent = false;
  lastBlockHeight = 0;
  lastBlockTime = 0;
  constructor(private $scope: angular.IScope,
              private heat: HeatService,
              private $interval: angular.IIntervalService,
              private settings: SettingsService) {
    this.refresh();
    let interval = $interval(()=>{ this.refresh() }, 60*1000, 0, false);
    $scope.$on('$destroy',()=>{ $interval.cancel(interval) });
  }
  refresh() {
    this.heat.api.getBlockchainStatus().then(status=>{
      this.$scope.$evalAsync(()=>{
        let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        let date = utils.timestampToDate(status.lastBlockTimestamp);
        this.lastBlockTime = dateFormat(date, format);
        this.lastBlockHeight = status.numberOfBlocks;
        if ((Date.now() - date.getTime()) > 1000 * 60 * 60) {
          this.showComponent = true;
        }
        else {
          this.showComponent = false;
        }
      })
    }, ()=>{
      this.$scope.$evalAsync(()=>{
        this.showComponent = false;
      })
    })
  }
}