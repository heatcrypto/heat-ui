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
module dialogs {
  export function prompt($event, title:string, description:string, defaultValue:string): angular.IPromise<string> {
    let $q = <angular.IQService> heat.$inject.get('$q');
    let deferred = $q.defer<string>();
    let locals = {
      v: {
        value: defaultValue||''
      },
      description: description||'',
    }
    dialogs.dialog({
      id: 'prompt',
      title: title,
      targetEvent: $event,
      template: `
        <p>{{vm.description}}</p>
        <md-input-container flex>
          <input type="text" ng-model="vm.v.value" autocomplete="off"></input><br>
        </md-input-container>
      `,
      locals: locals
    }).then(
      () => {
        deferred.resolve(locals.v.value)
      },
      deferred.reject
    )
    return deferred.promise
  }

  export function alert($event, title:string, description:string): angular.IPromise<any> {
    let $q = <angular.IQService> heat.$inject.get('$q');
    let deferred = $q.defer<string>();
    let locals = {
      description: description||'',
    }
    dialogs.dialog({
      id: 'alert',
      title: title,
      targetEvent: $event,
      template: `
        <p>{{vm.description}}</p>
      `,
      locals: locals
    }).then(
      () => {
        deferred.resolve()
      },
      deferred.reject
    )
    return deferred.promise
  }
}