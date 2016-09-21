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
/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 */
module heat.easing {
  // no easing, no acceleration
  export function linear(t) { return t }
  // accelerating from zero velocity
  export function easeInQuad(t) { return t*t }
  // decelerating to zero velocity
  export function easeOutQuad(t) { return t*(2-t) }
  // acceleration until halfway, then deceleration
  export function easeInOutQuad(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t }
  // accelerating from zero velocity
  export function easeInCubic(t) { return t*t*t }
  // decelerating to zero velocity
  export function easeOutCubic(t) { return (--t)*t*t+1 }
  // acceleration until halfway, then deceleration
  export function easeInOutCubic(t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 }
  // accelerating from zero velocity
  export function easeInQuart(t) { return t*t*t*t }
  // decelerating to zero velocity
  export function easeOutQuart(t) { return 1-(--t)*t*t*t }
  // acceleration until halfway, then deceleration
  export function easeInOutQuart(t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t }
  // accelerating from zero velocity
  export function easeInQuint(t) { return t*t*t*t*t }
  // decelerating to zero velocity
  export function easeOutQuint(t) { return 1+(--t)*t*t*t*t }
  // acceleration until halfway, then deceleration
  export function easeInOutQuint(t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
}