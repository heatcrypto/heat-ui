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

/* Add this to each md-virtual-repeat-container to have it populated with data
   when no fixed height was given */
heat.Loader.directive("virtualRepeatFlexHelper", () => {
  return {
    restrict: 'A',
    require: '^mdVirtualRepeatContainer',
    link: function(scope, element, attributes, mdVirtualRepeatContainer) {
      var delay = 100;
      var maxDuration = 10 * 1000; // 10 seconds
      var maxTries = maxDuration / delay;
      var tries = 0;
      var destroyed = false;
      scope.$on('$destroy', () => { destroyed = true });
      utils.repeatWhile(100, () => {
        if (destroyed || (tries++) > maxTries)
          return false;
        if (mdVirtualRepeatContainer.size > 0)
          return true;
        mdVirtualRepeatContainer.updateSize();
        return false;
      });
    }
  }
});

abstract class VirtualRepeatComponent {

  protected provider: IPaginatedDataProvider;
  protected decorator: (item:any,context:any)=>void;
  protected preprocessor: (firstIndex:number, lastIndex:number, items: Array<any>)=>void;
  protected PAGE_SIZE = 15; // number of items per page
  protected loadedPages = {};
  protected numItems = -1;
  public topIndex = 0;
  public selected = null;
  public loading: boolean = true;

  constructor(protected $scope: angular.IScope,
              protected $q: angular.IQService) {}

  /* Extending classes call this from their constructor */
  protected initializeVirtualRepeat(provider: IPaginatedDataProvider,
                decorator?: (item:any,context:any)=>void,
                preprocessor?: (firstIndex:number, lastIndex:number, items: Array<any>)=>void): angular.IPromise<number> {
    this.provider = provider;
    this.decorator = decorator;
    this.preprocessor = preprocessor;
    return this.determineLength();
  }

  /* md-virtual-repeat */
  public getItemAtIndex(index: number) {
    var pageNumber = Math.floor(index / this.PAGE_SIZE);
    var page = this.loadedPages[pageNumber];
    if (page) {
        var item = page[index % this.PAGE_SIZE];
        if (!this.selected) {
          this.selected = item;
        }
        return item;
    }
    else if (page !== null) {
        this.fetchPage(pageNumber);
    }
  }

  /* md-virtual-repeat */
  public getLength(): number {
    return this.numItems;
  }

  protected determineLength(retain?: boolean): angular.IPromise<number> {
    var deferred = this.$q.defer();
    if (this.provider) {
      this.loadedPages = {};
      this.provider.getLength().then((length) => {
        this.numItems = length;
        if (length == 0) {
          this.$scope.$evalAsync(() => { this.loading = false })
        }
        deferred.resolve(length);
      }, deferred.reject);
    } else {
      deferred.reject();
    }
    return deferred.promise;
  }

  protected fetchPage(pageNumber:number) {
    this.loadedPages[pageNumber] = null;
    var firstIndex = pageNumber * this.PAGE_SIZE;
    var lastIndex = firstIndex + this.PAGE_SIZE;
    this.provider.getResults(firstIndex, lastIndex).then((items) => {
      this.$scope.$evalAsync(() => { this.loading = false });
      if (this.preprocessor) {
        if (angular.isArray(items)) {
          this.preprocessor(firstIndex,lastIndex,items);
        }
      }
      if (this.decorator) {
        if (angular.isArray(items)) {
          items.forEach((item) => { this.decorator(item, this.loadedPages) });
        }
      }
      this.loadedPages[pageNumber] = items;
    });
  }

  public select(item) {
    this.selected = item;
    this.onSelect(item);
  }

  public abstract onSelect(item);
}