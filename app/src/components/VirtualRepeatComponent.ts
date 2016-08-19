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
abstract class VirtualRepeatComponent {

  protected provider: IPaginatedDataProvider;
  protected PAGE_SIZE = 30; // number of items per page
  protected loadedPages = {};
  protected numItems = -1;
  public topIndex = 0;
  public selected = null;
  public loading: boolean = true;

  constructor(private $scope: angular.IScope,
              private engine: EngineService) {}

  /* Extending classes call this from their constructor */
  protected initializeVirtualRepeat(provider: IPaginatedDataProvider) {
    this.provider = provider;
    this.determineLength();
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

  protected determineLength(retain?: boolean) {

    // /* To speed up loading trick the repeater to think there are always PAGE_SIZE items */
    // if (this.numItems == -1) {
    //   this.numItems = this.PAGE_SIZE;
    //   this.determineLength();
    // }
    // else {
      this.provider.getLength().then((length) => {
        this.$scope.$evalAsync(() => {
          this.loadedPages = {};
          this.numItems = length;
          if (length == 0) {
            this.loading = false;
          }
        })
      });
    // }
  }

  protected fetchPage(pageNumber:number) {
    this.loadedPages[pageNumber] = null;
    var firstIndex = pageNumber * this.PAGE_SIZE;
    var lastIndex = firstIndex + this.PAGE_SIZE;
    this.provider.getResults(firstIndex, lastIndex).then((transactions) => {
      this.$scope.$evalAsync(() => {
        this.loading = false;
        this.loadedPages[pageNumber] = transactions;
      });
    });
  }

  public select(item) {
    this.selected = item;
  }
}