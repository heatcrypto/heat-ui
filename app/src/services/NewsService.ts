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
@Service('news')
@Inject('$rootScope','settings','$http','$q')
class NewsService {

  public entries: Array<NewsEntry> = [];

  constructor(private $rootScope: angular.IRootScopeService,
              private settings: SettingsService,
              private $http: angular.IHttpService,
              private $q: angular.IQService) {
    this.load();
  }

  first() : NewsEntry {
    return this.entries[0];
  }

  load() {
    var deferred = this.$q.defer();
    var url = this.settings.get(SettingsService.NEWS_URL);
    this.$http.get(url).then(
      (response : any) => {
        this.$rootScope.$evalAsync(() => {
          this.entries = response.data.map((e:any) => new NewsEntry(e.date, e.title, e.content));
        })
      },
      deferred.reject
    )
    return deferred.promise;
  }
}

class NewsEntry {
  constructor(public date: string,
              public title: string,
              public content: string) {}
}