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
interface IDialogOptions {
  id: string; /* Required dialog identifier for registering styles */
  title?: string;
  okButton?: boolean; /* calls okButtonClick on controller or $mdDialog.hide */
  cancelButton?: boolean; /* calls cancelButtonClick on controller or $mdDialog.cancel */
  controller?: Function; /* will have $mdDialog injected as property */
  template: string,
  targetEvent?: any;
  locals?: any;
  style?: string;
}

interface IWizardOptions {
  id: string; /* Required wizard identifier for registering styles */
  title?: string;
  controller?: Function; /* will have $mdDialog injected as property */
  targetEvent?: any;
  locals?: any;
  style?: string;
  cancelButton?: boolean; /* calls cancelButtonClick on controller or $mdDialog.cancel */
  pages: Array<IWizardPage>;
}

interface IWizardPage {
  template: string;
  title?: string;
  show?(vm?: any, previousIndex?: number);
  continueBtnLabel?: string;
  okBtnLabel?: string;
}

module dialogs {
  export function $mdDialog(): angular.material.IDialogService {
    return <angular.material.IDialogService> heat.$inject.get('$mdDialog');
  }

  export function dialog(options: IDialogOptions): angular.IPromise<any> {
    if (angular.isString(options.style)) {
      var styleId = 'dialog-style-' + options.id;
      if (!document.getElementById(styleId)) {
        angular.element(document).find('head').append(`<style type="text/css" id="${styleId}">${options.style}</style>`);
      }
    }
    return dialogs.$mdDialog().show(<angular.material.IDialogOptions>{
      controller: options.controller||function () {},
      locals: angular.extend({
        title: options.title,
        okButton: angular.isDefined(options.okButton) ? options.okButton : true,
        cancelButton: options.cancelButton,
        $mdDialog: dialogs.$mdDialog()
      },options.locals||{}),
      controllerAs: 'vm',
      bindToController: true,
      parent: angular.element(document.body),
      targetEvent: options.targetEvent,
      template: `
      <md-dialog>
        <form name="dialogForm">
          <md-toolbar>
            <div class="md-toolbar-tools"><h2>{{vm.title}}</h2></div>
          </md-toolbar>
          <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
            <div flex layout="column">
              ${options.template}
            </div>
          </md-dialog-content>
          <md-dialog-actions layout="row">
            <span flex></span>
            <md-button ng-if="vm.cancelButton" class="md-warn" ng-click="vm.cancelButtonClick ? vm.cancelButtonClick() : vm.$mdDialog.cancel()" aria-label="Cancel">Cancel</md-button>
            <md-button ng-disabled="dialogForm.$invalid" ng-if="vm.okButton" class="md-primary"
              ng-click="vm.okButtonClick ? vm.okButtonClick() : vm.$mdDialog.hide()" aria-label="OK">{{vm.okButtonLabel?vm.okButtonLabel:'OK'}}</md-button>
          </md-dialog-actions>
        </form>
      </md-dialog>
      `
    });
  }

  export function wizard(options: IWizardOptions): angular.IPromise<any> {
    if (angular.isString(options.style)) {
      var styleId = 'wizard-style-' + options.id;
      if (!document.getElementById(styleId)) {
        angular.element(document).find('head').append(`<style type="text/css" id="${styleId}">${options.style}</style>`);
      }
    }
    return dialogs.$mdDialog().show(<angular.material.IDialogOptions>{
      controller: options.controller||function () {},
      locals: angular.extend({
        title: options.title,
        cancelButton: options.cancelButton,
        $mdDialog: dialogs.$mdDialog(),
        pages: options.pages,
        wizardIndex: 0,
        goToNextPage: function () {
          this.wizardIndex++;
          if (angular.isFunction(this.pages[this.wizardIndex].show)) {
            this.pages[this.wizardIndex].show(this, this.wizardIndex-1);
          }
        },
        goToPreviousPage: function () {
          this.wizardIndex--;
          if (angular.isFunction(this.pages[this.wizardIndex].show)) {
            this.pages[this.wizardIndex].show(this, this.wizardIndex+1);
          }
        }
      },options.locals||{}),
      controllerAs: 'vm',
      bindToController: true,
      parent: angular.element(document.body),
      targetEvent: options.targetEvent,
      template: `
      <md-dialog>
        <form name="dialogForm">
          <md-toolbar>
            <div class="md-toolbar-tools"><h2>{{vm.title}}<span ng-show="vm.pages[vm.wizardIndex].title">{{vm.pages[vm.wizardIndex].title}}</span></h2></div>
          </md-toolbar>
          <md-dialog-content style="min-width:500px;max-width:600px" layout="column" layout-padding>
            <div flex layout="column">
              ${
                options.pages.map((page, index) =>
                  `<div flex layout="column" ng-if="vm.wizardIndex==${index}">` +
                    page.template +
                  '</div>'
                ).join('')
              }
            </div>
          </md-dialog-content>
          <md-dialog-actions layout="row">
            <md-button ng-show="!vm.hideCancelBtn"
                ng-click="vm.cancelButtonClick ? vm.cancelButtonClick() : vm.$mdDialog.cancel()" aria-label="Cancel">Cancel</md-button>
            <span flex></span>
            <md-button ng-click="vm.goToPreviousPage()"
                ng-show="vm.wizardIndex>0 && !vm.hideBackBtn" aria-label="Back">Back</md-button>
            <md-button ng-disabled="dialogForm.$invalid"
                ng-show="vm.wizardIndex < (vm.pages.length-1)"
                ng-click="vm.goToNextPage()" aria-label="Continue">{{vm.pages[vm.wizardIndex].continueBtnLabel||'Continue'}}</md-button>
            <md-button ng-disabled="dialogForm.$invalid"
                ng-show="vm.wizardIndex == (vm.pages.length-1) && !vm.hideOkBtn"
                ng-click="vm.okButtonClick ? vm.okButtonClick() : vm.$mdDialog.hide()" aria-label="Ok">{{vm.pages[vm.wizardIndex].okBtnLabel||'Ok'}}</md-button>
          </md-dialog-actions>
        </form>
      </md-dialog>
      `
    });
  }
}
