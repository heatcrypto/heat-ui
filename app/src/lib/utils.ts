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
declare var BigInteger;
module utils {

  export function convertNQT(amountNQT: string, decimals?: number) {
    if (typeof amountNQT == 'undefined')  return '0';

    var negative        = '',
        decimals        = decimals || 8,
        afterComma      = '',
        amount          = new BigInteger(String(amountNQT)),
        factor          = String(Math.pow(10, decimals)),
        fractionalPart  = amount.mod(new BigInteger(factor)).toString();

    amount = amount.divide(new BigInteger(factor));
    if (amount.compareTo(BigInteger.ZERO) < 0) {
      amount = amount.abs();
      negative = '-';
    }
    if (fractionalPart && fractionalPart != "0") {
      afterComma = '.';
      for (var i=fractionalPart.length; i<decimals; i++) {
        afterComma += '0';
      }
      afterComma += fractionalPart.replace(/0+$/, "");
    }
    amount = amount.toString();
    return negative + amount + afterComma;
  }

  export function commaFormat(amount) {
    if (typeof amount == 'undefined') {
      return '0';
    }
    var neg    = amount.indexOf('-') == 0 && (amount.shift());
    amount     = amount.split('.'); // input is result of convertNQT
    var parts  = amount[0].split("").reverse().join("").split(/(\d{3})/).reverse();
    var format = [];
    for(var i=0;i<parts.length;i++) {
      if (parts[i]) {
        format.push(parts[i].split('').reverse().join(''));
      }
    }
    return (neg?'-':'')+format.join(',')+(amount.length==2?('.'+amount[1]):'');
  }

  export function convertToNQT(amountNXT: string, decimals: number = 8) {
    if (typeof amountNXT == 'undefined') {
      return '0';
    }
    amountNXT   = String(amountNXT).replace(/,/g,'');
    var parts   = amountNXT.split(".");
    var amount  = parts[0];
    var fraction;
    if (parts.length == 1) {
      fraction = "00000000";
    }
    else if (parts.length == 2) {
      if (parts[1].length <= decimals) {
        fraction = parts[1];
      }
      else {
        fraction = parts[1].substring(0, decimals);
      }
    }
    else {
      throw "Invalid input";
    }
    for (var i=fraction.length; i<decimals; i++) {
      fraction += "0";
    }
    var result = amount + "" + fraction;
    if (!/^\d+$/.test(result)) {
      throw "Invalid input.";
    }
    result = result.replace(/^0+/, "");
    if (result === "") {
      result = "0";
    }
    return result;
  }

  export function isNumber(value: string) {
    var num = String(value).replace(/,/g,'');
    if(num.match(/^\d+$/)) {
      return true;
    }
    else if(num.match(/^\d+\.\d+$/)) {
      return true;
    }
    return false;
  }

  /**
   * Very forgiving test to determine if the number of fractional parts
   * exceeds @decimals param.
   *
   * @param value String number value, can contain commas
   * @param decimals Number max allowed number of decimals.
   * @return boolean
   */
  export function hasToManyDecimals(value: string, decimals: number) {
    var num = String(value).replace(/,/g,'');
    var parts = num.split(".");
    if (parts[1] && parts[1].length > decimals) {
      return true;
    }
    return false;
  }

  export function timestampToDate(timestamp: number) {
    return new Date(Date.UTC(2013, 10, 24, 12, 0, 0, 0) + timestamp * 1000);
  }

  export function roundTo(value: string, decimals: number): string {
    return String(parseFloat(value).toFixed(decimals));
  }

  export function delayPromise<T>(promise: angular.IPromise<T>, delay: number): angular.IPromise<T> {
    var $q = <angular.IQService> lompsa.$inject.get('$q');
    var deferred = $q.defer();
    var result, resolved = false, rejected = false;
    var timeout = setTimeout(function () {
      timeout = null;
      if (resolved) {
        deferred.resolve(result);
      }
      else if (rejected) {
        deferred.reject(result);
      }
    }, delay);
    promise.then(
      (r) => {
        result = r;
        resolved = true;
        if (timeout === null) {
          deferred.resolve(r);
        }
      },
      (r) => {
        result = r;
        rejected = true;
        if (timeout === null) {
          deferred.reject(r);
        }
      });
    return deferred.promise;
  }

  export function convertToQNTf(quantity: string, decimals: number): string {
    if (typeof quantity == 'undefined') {
      return '0';
    }
    if (quantity.length < decimals) {
      for (var i = quantity.length; i < decimals; i++) {
        quantity = "0" + quantity;
      }
    }
    var afterComma = "";
    if (decimals) {
      afterComma = "." + quantity.substring(quantity.length - decimals);
      quantity = quantity.substring(0, quantity.length - decimals);
      if (!quantity) {
        quantity = "0";
      }
      afterComma = afterComma.replace(/0+$/, "");
      if (afterComma == ".") {
        afterComma = "";
      }
    }
    return quantity + afterComma;
  }

  export function calculateOrderPricePerWholeQNT(price: string, decimals: number): string {
    var orderPrice: jsbn.BigInteger = new BigInteger(String(price)).multiply(new BigInteger("" + Math.pow(10, decimals)));
    return utils.convertNQT(orderPrice.toString(), 8);
  }

  export function calculateOrderTotalNQT(priceNQT: string, quantityQNT: string): string {
    var orderTotal: jsbn.BigInteger = new BigInteger(String(quantityQNT)).multiply(new BigInteger(String(priceNQT)));
    return orderTotal.toString();
  }

  export class ConvertToQNTError implements Error  {
    public name = "ConvertToQNTError";
    constructor(public message: string, public code: number) {}
  }

  /**
   * Converts a float to a QNT based on the number of decimals to use.
   * Note! That this method throws a ConvertToQNTError in case the
   * input is invalid. Callers must catch and handle this situation.
   *
   * @throws utils.ConvertToQNTError
   */
  export function convertToQNT(quantity: string, decimals: number): string {
    var parts = quantity.split(".");
    var qnt   = parts[0];
    if (parts.length == 1) {
      if (decimals) {
        for (var i = 0; i < decimals; i++) {
          qnt += "0";
        }
      }
    }
    else if (parts.length == 2) {
      var fraction = parts[1];
      if (fraction.length > decimals) {
        throw new ConvertToQNTError("Fraction can only have " + decimals + " decimals max.",1);
      }
      else if (fraction.length < decimals) {
        for (var i = fraction.length; i < decimals; i++) {
          fraction += "0";
        }
      }
      qnt += fraction;
    }
    else {
      throw new ConvertToQNTError("Incorrect input",2);
    }
    //in case there's a comma or something else in there.. at this point there should only be numbers
    if (!/^\d+$/.test(qnt)) {
      throw new ConvertToQNTError("Invalid input. Only numbers and a dot are accepted.",3);
    }
    //remove leading zeroes
    return qnt.replace(/^0+/, "");
  }

  export function calculatePricePerWholeQNT(price: string, decimals: number): string {
    if (decimals) {
      var toRemove = price.slice(-decimals);
      if (!/^[0]+$/.test(toRemove)) {
        throw "Invalid input";
      }
      return price.slice(0, -decimals);
    }
    return price;
  }

  /**
   * Count bytes in a string's UTF-8 representation.
   * @param   string
   * @return  number
   */
  export function getByteLen(value: string): number {
    var byteLen = 0;
    for (var i = 0; i < value.length; i++) {
      var c = value.charCodeAt(i);
      byteLen += c < (1 <<  7) ? 1 :
                c < (1 << 11) ? 2 :
                c < (1 << 16) ? 3 :
                c < (1 << 21) ? 4 :
                c < (1 << 26) ? 5 :
                c < (1 << 31) ? 6 : Number.NaN;
    }
    return byteLen;
  }

  /* Prepares an RS account ID for display in Blocktech app when no suitable email address
     for account is available. */
  export function normalizeRsAccount(account: string) {
    return account.trim().replace(/FIM-/,'').replace(/-/g,'').toLowerCase();
  }

  export function debounce(func: Function, wait?: number, immediate?: boolean) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };

  export function emptyToNull(input: string): string {
    return (angular.isString(input) && input.trim().length == 0) ? null : input;
  }
}