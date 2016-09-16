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
abstract class AbstractBatchViewerComponent {

  public batches : Array<Batch> = [];
  public batchSize: number = 10;
  public canScrollUp: boolean = true;

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService) {
  }

  abstract getCount() : angular.IPromise<number>;

  abstract getItems(firstIndex: number, lastIndex: number) : angular.IPromise<Array<any>>;

  public clear() {
    this.batches = [];
  }

  public getFirst() : Batch {
    return this.batches[0];
  }

  public getLast() : Batch {
    return this.batches[this.batches.length -1]
  }

  /* Get the firstIndex from the lastly added batch */
  public getFirstIndex() : number {
    return this.getLast().firstIndex
  }

  public getBatch(index: number) : angular.IPromise<Batch> {
    var deferred = this.$q.defer();
    if (angular.isDefined(this.batches[index])) {
      deferred.resolve(this.batches[index]);
    }
    else {
      this.getBatchInternal(index).then(deferred.resolve, deferred.reject);
    }
    return deferred.promise;
  }

  private getBatchInternal(index: number): angular.IPromise<Batch> {
    var deferred = this.$q.defer();
    // get any batch but the first one
    if (angular.isDefined(this.batches[index-1])) {
      var previousFirstIndex = this.batches[index-1].firstIndex;
      var firstIndex = Math.max(0, previousFirstIndex-this.batchSize);
      var lastIndex = previousFirstIndex;
      this.getItems(firstIndex, lastIndex).then(
        (items) => {
          this.batches[index] = new Batch(this, items, firstIndex, lastIndex)
          deferred.resolve(this.batches[index]);
        },
        deferred.reject
      );
    }
    // get the first batch
    else {
      this.getCount().then(
        (count) => {
          var batchIndex = Math.floor(count / this.batchSize);
          var firstIndex = batchIndex * this.batchSize;
          var lastIndex = count;
          firstIndex = Math.max(0, firstIndex - this.batchSize);
          this.getItems(firstIndex, lastIndex).then(
            (items) => {
              this.batches[index] = new Batch(this, items, firstIndex, lastIndex)
              deferred.resolve(this.batches[index]);
            },
            deferred.reject
          );
        },
        deferred.reject
      );
    }
    return deferred.promise;
  }

  protected scrollUp() {
    if (this.getFirstIndex() > 0) {
      var batchIndex = this.batches.length -1;
      this.getBatch(batchIndex +1).then(() => {
        this.$scope.$evalAsync(() => {
          this.canScrollUp = this.getFirstIndex() > 0;
        });
      });
    }
  }
}

class Batch {
  static COUNTER = 0;
  constructor(private viewer: AbstractBatchViewerComponent,
              public entries: Array<any>,
              public firstIndex: number,
              public lastIndex: number) {
    entries.forEach((e) => { e["__id"] = e["__id"] || `batch-entry-${Batch.COUNTER++}` });
  }

  public loadMore() : angular.IPromise<any> {
    var deferred = this.viewer.$q.defer();
    this.viewer.getCount().then(
      (count) => {
        if ((count -1) > this.lastIndex) {
          this.viewer.getItems(this.lastIndex +1, count -1).then(
            (items) => {
              items.forEach((item) => {
                this.entries.push(item);
                this.lastIndex++;
              });
            },
            deferred.reject
          )
        }
      },
      deferred.reject
    );
    return deferred.promise;
  }

  public getFirst() : any {
    return this.entries[0];
  }

  public getLast() : any {
    return this.entries[this.entries.length-1];
  }
}