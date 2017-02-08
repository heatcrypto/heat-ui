/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 David Chin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
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
 */
(function() {
  'use strict';
  angular.module('dc.inputAddOn', []).directive('inputAppend', directiveFn('append')).
                                      directive('inputPrepend', directiveFn('prepend'));

  function AddOnFilter(type, attrs, model) {
    // Set props
    this.type = type;
    this.name = type === 'prepend' ? 'inputPrepend' : 'inputAppend';

    // Add parser / formatter
    model.$parsers.unshift(angular.bind(this, this.parse));
    model.$formatters.unshift(angular.bind(this, this.format));

    // Observe attr change
    attrs.$observe(this.name, angular.bind(this, this.define));

    // Define
    this.define(attrs[this.name]);
  }

  AddOnFilter.prototype.format = function(value) {
    var regexp;

    if (this.type === 'prepend') {
      regexp = new RegExp('^(' + this.escapedAddOn + ')');
    } else {
      regexp = new RegExp('(' + this.escapedAddOn + ')$');
    }

    return angular.isString(value) ? value.replace(regexp, '') : value;
  };

  AddOnFilter.prototype.parse = function(value) {
    var regexp,
        newValue;

    if (this.type === 'prepend') {
      regexp = new RegExp('^(' + this.escapedAddOn + ')?');
      newValue = this.addOn + '$`';
    } else {
      regexp = new RegExp('(' + this.escapedAddOn + ')?$');
      newValue = '$\'' + this.addOn;
    }

    return angular.isString(value) ? value.replace(regexp, newValue) : value;
  };

  AddOnFilter.prototype.define = function(value) {
    this.addOn = value;
    this.escapedAddOn = this.escape(this.addOn);
  };

  AddOnFilter.prototype.escape = function(str) {
    if (str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    } else {
      return '';
    }
  };

  function directiveFn(type) {
    return function() {
      return {
        restrict: 'A',
        require: 'ngModel',

        link: function(scope, element, attrs, model) {
          var addOnFilter = new AddOnFilter(type, attrs, model);
        }
      };
    };
  }
})();