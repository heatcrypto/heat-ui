/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd
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

function Inject(...args: string[]) {
  return (target: any, key?: string, index?: number): void => {
    if (angular.isNumber(index)) {
      target.$inject = target.$inject || [];
      target.$inject[index] = args[0];
    } else {
      target.$inject = args;
    }
  };
}

function Component(options) {
  return (target: any): void => {
    var d = {
      controller: target,
      controllerAs: 'vm',
      scope: {}
    };
    target.$$selector = options.selector;

    if (angular.isArray(options.styles)) {
      angular.forEach(options.styles, (s) => {
        angular.element(document).find('head').append(`<style type="text/css">${s}</style>`);
      });
    }
    if (angular.isString(options.style)) {
      angular.element(document).find('head').append(`<style type="text/css">${options.style}</style>`);
    }
    if (angular.isString(options.template)) {
      d['template'] = options.template;
    }
    /* Prepend an input with @ to make it an attribute binding */
    if (angular.isArray(options.inputs)) {
      d['bindToController'] = {};
      options.inputs.forEach((input) => {
        var bind = input.charAt(0) == '@' ? '@' : '=';
        if (bind == '@') {
          input = input.substring(1);
        }
        d['bindToController'][input] = bind;
      });
      target.$$inputs = options.inputs;
    }
    if (angular.isArray(options.outputs)) {
      d['bindToController'] = d['bindToController'] || {};
      options.outputs.forEach((output) => d['bindToController'][output] = '&');
    }
    if (angular.isFunction (options.link)) {
      d['link'] = options.link;
    }
    if (angular.isDefined(options.transclude)) {
      d['transclude'] = !!options.transclude;
    }
    heat.Loader.directive(options.selector, () => (d));
  };
}

function Service(name) {
  return (target: any): void => {
    var arr = target.$inject ? [].concat(target.$inject) : [];
    function F(args): void {
      return target.apply(this, args);
    }
    F.prototype = target.prototype;
    arr.push(function() {
      return new F(arguments);
    });
    heat.Loader.factory(name, arr);
  }
}

/* @RouteConfig */

/* Copied from router.es5.js */
function dashCase(str) {
  return str.replace(/([A-Z])/g, ($1) => '-' + $1.toLowerCase());
}

/* Takes a dash-case or lower case component selector name and returns a matching
   controller for use in $router.
   foo-bar -> FooBarController
   foo -> FooController */
function controllerNameFromPath(str) {
  return str.split('/')[1].split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Controller';
}

/* Generates a controller template hosting just a single component, the component inputs
   are mapped against the expected controller routeParams (which are in $$inputs) by
   referencing those routeParams on the component element attributes
   Returns something like <selector name="fooBar.$$routeParams.name"></selector> */
function createControllerTemplate(selector: string, inputs: any) {
  var dashName = dashCase(selector);
  var t = [];
  /* Must provide ng-if="1" here so our child component can access its route params from the constructor */
  t.push('<',dashName, ' ng-if="1" flex layout="column" layout-fill');
  angular.forEach(inputs, (name) => {
    t.push(' ',name,'="',selector,'.$$routeParams.',name,'"')
  });
  t.push('></',dashName,'>');
  return t.join('');
}

/* Anonymous route controller component, looks at the component inputs to
   deteremine what routeParams must be made available on the $$routeParams
   scope variable.
   The data in the $$routeParams variable is later made available to the
   component so it can access them as normal inputs. */
function createController(inputs: any) {
  Controller.$inject = ['$routeParams'];
  function Controller($routeParams) {
    this.$$routeParams = {};
    if (angular.isArray(inputs)) {
      for (var i=0; i<inputs.length; i++) {
        this.$$routeParams[inputs[i]] = $routeParams[inputs[i]];
      }
    }
  }
  return Controller;
}

/**
 * To use @RouteConfig create a component and add a @RouteConfig annotation,
 * the RouteConfig will dynamically create a miniature wrapper controller
 * and template and registers that with the templatecache.
 *
 * The @path argument is the route DSL path. The individual parameters are
 * made available on the component controller itself.
 *
 * The @path can be either a string or an array of strings. NOTE that if you
 * use an array only the first entry is used to determine the controller name
 * so make sure all entries in the array have the same value for /name/***
 */
function RouteConfig(...paths: string[]) {
  return (target: any): void => {
    heat.Loader.controller(controllerNameFromPath(paths[0]), createController(target.$$inputs));

    heat.Loader.run(['$templateCache','$router', function ($templateCache, $router) {

      var dashName = dashCase(target.$$selector);
      $templateCache.put('./components/' + dashName + '/' + dashName + '.html',
                          createControllerTemplate(target.$$selector, target.$$inputs));

      angular.forEach(paths, (p) => $router.config({ path: p, component: target.$$selector }));
    }]);
  }
}