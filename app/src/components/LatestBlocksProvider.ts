/*
 * The MIT License (MIT)
 * Copyright (c) 2017 Heat Ledger Ltd.
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

@Service('latestBlocksProviderFactory')
@Inject('heat','$q')
class LatestBlocksProviderFactory  {
  constructor(private heat: HeatService, private $q: angular.IQService) {}

  /* Optionally pass a single block object which will be displayed as its single result */
  public createProvider(blockObject?: IHeatBlock, account?:string): IPaginatedDataProvider {
    return new LatestBlocksProvider(this.heat, this.$q, blockObject, account);
  }
}

class LatestBlocksProvider implements IPaginatedDataProvider {
  constructor(private heat: HeatService,
              private $q: angular.IQService,
              private blockObject: IHeatBlock,
              private account: string) {}

  /* Be notified this provider got destroyed */
  public destroy() {}

  /* The number of items available */
  public getPaginatedLength(): angular.IPromise<number> {
    let deferred = this.$q.defer<number>();
    if (angular.isDefined(this.blockObject)) {
      deferred.resolve(1);
    }
    else {
      if (this.account) {
        this.heat.api.getAccountBlocksCount(this.account).then(count=>{
          deferred.resolve(count);
        },deferred.reject)
      }
      else {
        this.heat.api.getBlockchainStatus().then((status) => {
          deferred.resolve(status.numberOfBlocks);
        },deferred.reject);
      }
    }
    return <angular.IPromise<number>>deferred.promise;
  }

  /* Returns results starting at firstIndex and up to and including lastIndex */
  public getPaginatedResults(firstIndex: number, lastIndex: number): angular.IPromise<Array<IHeatBlock>> {
    if (angular.isDefined(this.blockObject)) {
      let deferred = this.$q.defer<Array<IHeatBlock>>();
      deferred.resolve([this.blockObject]);
      return <angular.IPromise<Array<IHeatBlock>>> deferred.promise;
    }
    else {
      if (this.account) {
        return <angular.IPromise<Array<IHeatBlock>>> this.heat.api.getAccountBlocks(this.account, firstIndex, lastIndex);
      }
      else {
        return <angular.IPromise<Array<IHeatBlock>>> this.heat.api.getBlocks(firstIndex, lastIndex);
      }
    }
  }
}
