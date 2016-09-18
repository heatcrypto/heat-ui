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

  constructor(public $scope: angular.IScope,
              public $q: angular.IQService,
              public $timeout: angular.ITimeoutService) {}

  abstract getCount() : angular.IPromise<number>;

  abstract getItems(firstIndex: number, lastIndex: number) : angular.IPromise<Array<any>>;

  abstract getScrollContainer() : duScroll.IDocumentService;

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

  protected getParentScope() {
    return this.$scope.$parent['vm'];
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
      var lastIndex = previousFirstIndex-1;
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
              this.batches[index] = new Batch(this, items, firstIndex, lastIndex);
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
      var topBatch = this.batches[batchIndex];
      var topEntryId = topBatch.getFirst().__id;
      var topEntryElement = angular.element(document.getElementById(topEntryId));

      // 1. set ui to display as loading, this reveals the progress indicator and hides the
      //    load more button (automatically bringing the top entry to the top)
      this.$scope.$evalAsync(() => { this.getParentScope().loading = true });

      // 2. load the next batch
      this.getBatch(batchIndex +1).then(() => {
        this.$scope.$evalAsync(() => {
          // flush ui updates by leaving the event loop
          this.$timeout(500).then(() => {
            // the new entries have been added to the ui which auto-scrolls the container
            // to the top. we however want to instantly have the previously 'at the top'
            // element back at the top.
            this.getScrollContainer().duScrollToElement(topEntryElement, 0, 0, null).then(() => {
              this.$scope.$evalAsync(() => {
                this.getParentScope().loading = false
                this.$timeout(0).then(() => {
                  var offset = this.getScrollContainer()[0].clientHeight -
                              topEntryElement[0].offsetHeight;
                  this.getScrollContainer().duScrollToElement(topEntryElement, offset, 1200, heat.easing.easeOutCubic);
                })
              });
            });
          });
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
    var batch = this; // Some weirdness going on here which is causing the window var to be
                      // assigned to typescript this inside the first getCount.
                      // This will do for now.
    var deferred = this.viewer.$q.defer();
    this.viewer.getCount().then(
      (count) => {
        if (count > batch.lastIndex) {
          batch.viewer.getItems(batch.lastIndex, count).then(
            (items) => {
              items.forEach((item) => {
                item["__id"] = `batch-entry-${Batch.COUNTER++}`;
                batch.entries.push(item);
                batch.lastIndex++;
              });
              deferred.resolve(items);
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