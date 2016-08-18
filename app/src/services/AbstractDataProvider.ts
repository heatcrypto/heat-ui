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
abstract class AbstractDataProvider<T> {

  protected providers: Array<DataProvider<T>> = [];
  protected data: T;
  protected isLoading: boolean = false;

  public createProvider($scope: angular.IScope) {
    var provider = new DataProvider<T>($scope);
    provider.data = this.getInitialData();
    this.providers.push(provider);
    $scope.$on('$destroy', () => { this.destroyProvider(provider) });
    if (!this.isLoading) {
      provider.update(this.data);
    }
    return provider;
  }

  private destroyProvider(provider: DataProvider<T>) {
    this.providers = this.providers.filter((p) => p != provider);
  }

  abstract getData(): angular.IPromise<T>;
  abstract getInitialData(): T;

  protected refresh() {
    this.providers.forEach((provider) => { provider.refreshBegin() });
    this.isLoading = true;
    this.getData().then((data: T) => {
      this.isLoading = false;
      this.data = data;
      this.providers.forEach((provider) => { provider.update(data) });
    });
  }

}

class DataProvider<T> {

  public data: T;
  public loading: boolean = true;

  constructor(private $scope: angular.IScope) {}

  public update(data: T) {
    this.$scope.$evalAsync(() => {
      this.loading = false;
      this.data = data;
    });
  }

  public refreshBegin() {
    this.loading = true;
    this.$scope.$evalAsync(angular.noop);
  }
}