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

class DialogFieldBuilder {
  constructor(private $scope: angular.IScope) {}

  money(name: string, _default?: any): DialogFieldMoney { return new DialogFieldMoney(this.$scope, name, _default) }
  account(name: string, _default?: any): DialogFieldAccount { return new DialogFieldAccount(this.$scope, name, _default) }
  asset(name: string, _default?: any): DialogFieldAsset { return new DialogFieldAsset(this.$scope, name, _default) }
  text(name: string, _default?: any): DialogFieldText { return new DialogFieldText(this.$scope, name, _default) }
  hidden(name: string, _default?: any): DialogFieldHidden { return new DialogFieldHidden(this.$scope, name, _default) }
  staticText(name: string, _default: any): DialogFieldStatic { return new DialogFieldStatic(this.$scope, name, _default) }
}

interface IGenericFieldParserFunction {
  (v: any): any;
}

interface IGenericFieldFormatterFunction {
  (v: any): any;
}

interface IGenericFieldChangedFunction {
  (newValue: any, previousValue?: any): any;
}

interface IGenericFieldValidatorFunction {
  (modelValue: any, viewValue?: any): boolean | angular.IPromise<boolean>;
}

interface ITransactionFieldValidator {
  validator: IGenericFieldValidatorFunction;
  message: string;
}

abstract class AbstractDialogField {

  private _previousValue: any;
  private _onchange: Array<IGenericFieldChangedFunction> = [];

  public parsers: Array<IGenericFieldParserFunction> = [];
  public formatters: Array<IGenericFieldFormatterFunction> = [];
  public validators: Array<ITransactionFieldValidator> = [];
  public asyncValidators: Array<ITransactionFieldValidator> = [];
  public errorMessages: Array<any> = [];

  public _label: string;
  public _selector: string;
  public _required: boolean = false;
  public _readonly: boolean = false;
  public _disabled: boolean = false;
  public _visible: boolean = true;

  constructor(private $scope: angular.IScope,
              public name: string,
              public value: any) {
    this._previousValue = value;
  }

  /* Model change listener */
  changed(force?: boolean) {
    if (force || this.value != this._previousValue) {
      this._onchange.forEach((fn: IGenericFieldChangedFunction) => {
        fn(this.value, this._previousValue);
      });
      this._previousValue = this.value;
    }
  }

  protected selector(selector: string) {
    this._selector = selector;
  }

  /**
   * Either provide a single parser function or an array of parser functions
   * @param parser Array<Function>|Function
   * @returns AbstractDialogField
   * */
  public parse(parser: any) {
    this.parsers = this.parsers.concat(parser);
    return this;
  }

  /**
   * Either provide a single formatter function or an array of formatter functions
   * @param parser Array<Function>|Function
   * @returns AbstractDialogField
   * */
  public formatter(formatter: any) {
    this.formatters = this.formatters.concat(formatter);
    return this;
  }

  /**
   * Provide a synchronous validator function and error message
   * @param message String error message to display with control
   * @param validator Function(val) returns Boolean
   * @returns AbstractDialogField
   * */
  public validate(message: string, validator: IGenericFieldValidatorFunction) {
    this.validators.push({
      validator: validator,
      message: message
    });
    return this;
  }

  /**
   * Provide a asynchronous validator function and error message
   * @param message String error message to display with control
   * @param validator Function(val) returns Boolean
   * @returns AbstractDialogField
   * */
  public asyncValidate(message: string, validator: IGenericFieldValidatorFunction) {
    this.asyncValidators.push({
      validator: validator,
      message: message
    });
    return this;
  }

  /**
   * Provide a callback that will be called when the model value changes
   * @param fn IGenericFieldChangedFunction
   * @returns AbstractDialogField
   */
  public onchange(fn: IGenericFieldChangedFunction) {
    this._onchange.push(fn);
    return this;
  }

  public required(required?: boolean) {
    this._required = angular.isDefined(required) ? required : true;
    return this;
  }

  public readonly(readonly?: boolean) {
    this._readonly = angular.isDefined(readonly) ? readonly : true;
    return this;
  }

  public label(label: string) {
    this._label = label;
    return this;
  }

  public disabled(disabled: boolean) {
    this._disabled = disabled;
    return this;
  }

  public visible(visible: boolean) {
    this._visible = visible;
    return this;
  }
}

@Component({
  selector: 'field',
  inputs: ['label','value','changed','f'],
  /* Every field must add a linear progress handler beneath the input element
     in order to support displaying async validator progress.

     <md-progress-linear md-mode="indeterminate" ng-if="userForm.userField.$pending">
     </md-progress-linear>

     Also on the containing input container a conditional class has to be added
     that signals the sync validators are loading.

     <md-input-container ... ng-class="{'async-validator-pending':userForm.userField.$pending}"> */
  styles: [`
    field .async-validator-pending md-progress-linear,
    field .async-validator-pending md-progress-linear * {
      height: 3px !important;
    }
    field .async-validator-pending .md-input:focus {
      border-width: 0px !important;
    }
  `],
  link: (scope, element, attrs, controller) => {
    var h = [];
    h.push('<',attrs.selector, ' label="vm.label" value="vm.value" changed="vm.changed" f="vm.f">');
    h.push('</',attrs.selector,'>');
    element.html(h.join(''));
    element.injector().get('$compile')(element.contents())(scope);
  }
})
class Field {}

heat.Loader.directive('fieldValidator', function() {
  return {
    require: '^ngModel',
    link: function(scope, elm, attrs: any, ngModel: any) {

      elm.bind('blur', function() {
        if(!ngModel.$valid) {
            return;
        }
        var viewValue = ngModel.$modelValue;
        var formatters = ngModel.$formatters;
        for (var i = formatters.length - 1; i >= 0; --i) {
            viewValue = formatters[i](viewValue);
        }
        ngModel.$viewValue = viewValue;
        ngModel.$render();
      });

      var field: AbstractDialogField = scope.$eval(attrs.fieldValidator);
      if (!field) {
        return;
      }

      field.formatters.forEach((fn) => { ngModel.$formatters.unshift(fn) });

      field.parsers.forEach((fn) => { ngModel.$parsers.push(fn) });

      field.validators.forEach((validator: ITransactionFieldValidator, index: number) => {
        ngModel.$validators[`validator_${index}`] = function (modelValue, viewValue) {
          return validator.validator(modelValue, viewValue);
        };
        field.errorMessages.push({
          type: `validator_${index}`,
          text: validator.message
        });
      });

      field.asyncValidators.forEach((validator: ITransactionFieldValidator, index: number) => {
        ngModel.$asyncValidators[`async_validator_${index}`] = function (modelValue, viewValue) {
          return validator.validator(modelValue, viewValue);
        };
        field.errorMessages.push({
          type: `async_validator_${index}`,
          text: validator.message
        });
      });
    }
  };
});