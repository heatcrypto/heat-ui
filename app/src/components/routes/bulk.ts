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
@RouteConfig('/bulk')
@Component({
  selector: 'bulk',
  template: `
    <div layout="column" flex layout-padding>
      <div layout="row">
        <md-input-container>
          <label>Count</label>
          <input type="text" ng-model="vm.count" required name="count">
        </md-input-container>
        <md-input-container>
          <md-checkbox ng-model="vm.rsFormat" required name="rsFormat">
            RS-format
          </md-checkbox>
        </md-input-container>
        <span flex></span>
        <md-input-container>
          <md-button ng-click="vm.generate()">Generate</md-button>
        </md-input-container>
      </div>
      <div layout="column" flex layout-fill>
        <textarea ng-model="vm.csvOutput" flex></textarea>
      </div>
    </div>
  `
})
@Inject('$scope', 'secretGenerator', 'address')
class BulkComponent {

  csvOutput: string;
  count: number;
  rsFormat: boolean;

  constructor(private $scope: angular.IScope,
              private secretGenerator: SecretGeneratorService,
              private address: AddressService) {}

  generate() {
    this.secretGenerator.generateBulk('en', this.count).then((bulk) => {
      this.$scope.$evalAsync(() => {
        var output = [];
        bulk.forEach((secretPhrase) => {
          var publicKey = heat.crypto.secretPhraseToPublicKey(secretPhrase);
          var addr = heat.crypto.getAccountIdFromPublicKey(publicKey);
          if (this.rsFormat) {
            addr = this.address.numericToRS(addr);
          }
          output.push(`"${addr}","${secretPhrase}"`);
        });
        this.csvOutput = output.join('\n');
      })
    })
  }
}