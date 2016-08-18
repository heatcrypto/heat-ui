/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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

/* Heavily inspired by http://blog.assaf.co/native-slide-toggle-for-angularjs-1-4-x/ */

angular.element(document).ready(() => {
  angular.element(document).find('head').append(`
    <style type="text/css">
      .slide-toggle {
        overflow: hidden;
        transition: all 2.5s;
      }
    </style>
  `);
});

lompsa.Loader.run(() => {
  lompsa.Loader.app.animation('.slide-toggle', ['$animateCss', function($animateCss) {
    var lastId = 0;
    var _cache = {};

    function getId(el) {
      var id = el[0].getAttribute("data-slide-toggle");
      if (!id) {
        id = ++lastId;
        el[0].setAttribute("data-slide-toggle", id);
      }
      return id;
    }

    function getState(id) {
      var state = _cache[id];
      if (!state) {
        state = {};
        _cache[id] = state;
      }
      return state;
    }

    function generateRunner(closing, state, animator, element, doneFn) {
      return function() {
        state.animating = true;
        state.animator = animator;
        state.doneFn = doneFn;
        animator.start().finally(function() {
          if (closing && state.doneFn === doneFn) {
            element[0].style.height = '';
          }
          state.animating = false;
          state.animator = undefined;
          state.doneFn();
        });
      }
    }

    return {
      addClass: function(element, className, doneFn) {
        if (className == 'ng-hide') {
          var state = getState(getId(element));
          var height = (state.animating && state.height) ?
            state.height : element[0].offsetHeight;

          var animator = $animateCss(element, {
            from: {
              height: height + 'px',
              opacity: 1
            },
            to: {
              height: '0px',
              opacity: 0
            }
          });
          if (animator) {
            if (state.animating) {
              state.doneFn =
                generateRunner(true,
                  state,
                  animator,
                  element,
                  doneFn);
              return state.animator.end();
            } else {
              state.height = height;
              return generateRunner(true,
                state,
                animator,
                element,
                doneFn)();
            }
          }
        }
        doneFn();
      },
      removeClass: function(element, className, doneFn) {
        if (className == 'ng-hide') {
          var state = getState(getId(element));
          var height = (state.animating && state.height) ?
            state.height : element[0].offsetHeight;

          var animator = $animateCss(element, {
            from: {
              height: '0px',
              opacity: 0
            },
            to: {
              height: height + 'px',
              opacity: 1
            }
          });

          if (animator) {
            if (state.animating) {
              state.doneFn = generateRunner(false,
                state,
                animator,
                element,
                doneFn);
              return state.animator.end();
            } else {
              state.height = height;
              return generateRunner(false,
                state,
                animator,
                element,
                doneFn)();
            }
          }
        }
        doneFn();
      }
    };
  }])
});