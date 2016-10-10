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
declare var Clipboard: any;
@Service('clipboard')
@Inject('$q', '$mdToast')
class ClipboardService {

  constructor(private $q: angular.IQService,
              private $mdToast: angular.material.IToastService) {}

  /**
   * Copies the text contents of the element and returns a promise.
   *
   * In case text could not be copied since we are on a device that does
   * not support `document.execCommand` (like Safari). The promise is
   * rejected but the text contents of the element will remain selected,
   * the user now has to copy the text by pressing CTRL+C.
   */
  copy(element: Element): angular.IPromise<any> {
    var deferred = this.$q.defer();

    window.getSelection().removeAllRanges();
    var range = document.createRange();
    range.selectNode(element);
    window.getSelection().addRange(range);

    try {
      if (document.execCommand('copy')) {
        window.getSelection().removeAllRanges();
        deferred.resolve();
      }
      else {
        deferred.reject();
      }
    } catch (e) {
      deferred.reject();
    }
    return deferred.promise;
  }

  /**
   * Copies the text contents of the element and displays a TOAST upon
   * success, in case the text could not be copied but an instruction is
   * displayed to use CTRL+C.
   */
  copyWithUI(element: Element, successMessage: string) : angular.IPromise<any> {
    return this.copy(element).then(
      () => {
        this.$mdToast.show(
          this.$mdToast.simple()
              .textContent(successMessage)
              .hideDelay(5000)
        )
      },
      () => {
        this.$mdToast.show(
          this.$mdToast.simple()
              .textContent("Press CTRL+V to copy")
              .hideDelay(10000)
        )
      }
    )
  }
}