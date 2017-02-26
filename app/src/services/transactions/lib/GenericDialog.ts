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

interface IGenericDialog extends angular.material.IDialogOptions {

  /**
   * Instantly send the transaction but do show the progress dialog, all the user has to
   * do is click the success button to close the dialog.
   * In case the transaction fails clicking the error button will close the dialog.
   *
   * @returns angular.IPromise<string> returns broadcasted transaction id
   * */
  send(): angular.IPromise<string>;

  /**
   * Shows the dialog, user has to click send button
   *
   * @returns angular.IPromise<string> returns broadcasted transaction id
   * */
  show(): angular.IPromise<string>;
}

enum GenericDialogState {
  EDIT, CREATE, SIGN, BROADCAST
}

enum GenericDialogBroadcastState {
  INTERNAL_TIMEOUT, INTERNAL_ERROR, SERVER_ERROR
}

abstract class GenericDialog implements angular.material.IDialogOptions {

  /* Implemented by extending class */
  abstract getTransactionBuilder(): TransactionBuilder;
  abstract getFields($scope: angular.IScope): Array<AbstractDialogField>;

  /* Providedd by extending classs */
  protected dialogTitle: string;
  protected dialogDescription: string;
  protected okBtnTitle: string = 'OK';

  /* Available for extending class - set from dialog controller */
  public fields: IStringHashMap<AbstractDialogField> = {};

  /* The dialog state determines what section is visible */
  public state: GenericDialogState = GenericDialogState.EDIT;

  /* Per state there are two sub states: BUSY and ERROR
     BUSY shows a progress indicator.
     ERROR shows an error indicator which you can click to go back to EDIT state
     or in case of BROADCAST to retry. */
  public busy: boolean = false;
  public error: boolean = false;

  /* Communicate error messages to user */
  public message: string;
  public secondaryMessage: string;

  /* Broadcast specific error state */
  public broadcastState: GenericDialogBroadcastState;

  /* Cancelled by user */
  public cancelled: boolean = false;

  /* Set to true when this dialog was activated through `send`, tells the dialog
     to close on pressing the error indicator. */
  public instantSend: boolean = false;

  public targetEvent;
  public bindToController = true;
  public controllerAs = 'vm';
  public controller = GenericDialogCreateController(this);
  public parent = angular.element(document.body);

  constructor($event?) {
    this.targetEvent = $event;
  }

  public send(): angular.IPromise<string> {
    this.instantSend = true;
    return this.show();
  }

  public show(): angular.IPromise<string> {
    var $mdDialog = <angular.material.IDialogService> heat.$inject.get('$mdDialog');
    return $mdDialog.show(this);
  }

  public template = `
    <md-dialog>
      <form name="dialogForm">
        <md-toolbar>
          <div class="md-toolbar-tools"><h2>{{ vm.dialogTitle }}</h2></div>
        </md-toolbar>
        <md-dialog-content style="min-width:500px" layout="column" layout-padding ng-switch="vm.state">

          <!-- EDIT -->
          <div ng-switch-when="0">
            <div ng-repeat="field in vm.fields">
              <field selector="{{field._selector}}" f="field" label="field._label" value="field.value" changed="field.changed()"></field>
            </div>
          </div>

          <!-- CREATE -->
          <div layout="column" layout-align="center center" ng-switch-when="1" layout-padding>
            <div layout="column" layout-align="center center">
              <md-progress-circular md-mode="indeterminate" ng-show="vm.busy"></md-progress-circular>
              <md-button class="md-fab md-warn" ng-click="vm.state=0;vm.error=false;vm.maybeClose()" ng-show="vm.error">
                <md-icon md-font-library="material-icons">warning</md-icon>
              </md-button>
            </div>
            <div layout="column" layout-align="center center">
              <div ng-show="vm.busy">Creating transaction</div>
              <div ng-show="vm.error">{{vm.message}}</div>
            </div>
          </div>

          <!-- SIGN -->
          <div layout="column" layout-align="center center" ng-switch-when="2" layout-padding>
            <div layout="column" layout-align="center center">
              <md-progress-circular md-mode="indeterminate" ng-show="vm.busy"></md-progress-circular>
              <md-button class="md-fab md-warn" ng-show="vm.error" ng-click="vm.cancelBtn()">
                <md-icon md-font-library="material-icons">warning</md-icon>
              </md-button>
            </div>
            <div layout="column" layout-align="center center">
              <div ng-show="vm.busy">Signing transaction</div>
              <div ng-show="vm.error">{{vm.message}}</div>
            </div>
          </div>

          <!-- BROADCAST -->
          <div layout="column" layout-align="center center" ng-switch-when="3" layout-padding>
            <div layout="column" layout-align="center center">
              <md-progress-circular md-mode="indeterminate" ng-show="vm.busy"></md-progress-circular>
              <md-button class="md-fab md-warn" ng-show="vm.error && vm.broadcastState == 0" ng-click="vm.broadcast()">
                <md-icon md-font-library="material-icons">refresh</md-icon>
              </md-button>
              <md-button class="md-fab md-warn" ng-show="vm.error && (vm.broadcastState == 1 || vm.broadcastState == 2)"
                    ng-click="vm.state=0;vm.error=false;vm.maybeClose()">
                <md-icon md-font-library="material-icons">warning</md-icon>
              </md-button>
              <md-button class="md-fab md-primary" ng-show="!vm.broadcastState && !vm.error && !vm.busy" ng-click="vm.dialogHide()">
                <md-icon md-font-library="material-icons">check</md-icon>
              </md-button>
            </div>
            <div layout="column" layout-align="center center">
              <div ng-show="vm.busy">Broadcasting transaction</div>
              <div ng-show="vm.error" layout="column" layout-align="center center">
                <div>{{ vm.message }}</div>
                <div>{{ vm.secondaryMessage }}</div>
              </div>
              <div ng-show="!vm.broadcastState && !vm.error && !vm.busy" layout="column" layout-align="center center">
                <!-- <div>Succesully broadcasted transaction</div> -->
                <div>Transaction completed</div>
              </div>
            </div>
          </div>
        </md-dialog-content>
        <md-dialog-actions layout="row" ng-switch="vm.state">
          <span flex></span>

          <!-- EDIT -->
          <div ng-switch-when="0">
            <md-button class="md-primary" ng-click="vm.cancelBtn()">Cancel</md-button>
            <md-button class="md-primary" ng-click="vm.okBtn()" ng-disabled="!dialogForm.$valid">{{vm.okBtnTitle}}</md-button>
          </div>

          <!-- CREATE -->
          <div ng-switch-when="1" ng-show="vm.busy">
            <md-button class="md-primary" ng-click="vm.cancelBtn()">Cancel</md-button>
          </div>

          <!-- SIGN -->
          <div ng-switch-when="2">
            <md-button class="md-primary" ng-click="vm.cancelBtn()" ng-show="vm.busy">Cancel</md-button>
            <md-button class="md-primary" ng-click="vm.cancelBtn()" ng-show="vm.error">Close</md-button>
          </div>

          <!-- BROADCAST -->
          <div ng-switch-when="3">
            <md-button class="md-primary" ng-click="vm.cancelBtn()" ng-show="vm.broadcastState==1 || vm.broadcastState==2">Cancel</md-button>
            <!-- <md-button class="md-primary" ng-click="vm.reset()" ng-show="!vm.broadcastState && !vm.error && !vm.busy">More</md-button> -->
          </div>
        </md-dialog-actions>
      </form>
    </md-dialog>
  `
}

function GenericDialogCreateController(dialog: GenericDialog) {

  return function ($scope: angular.IScope,
                   $mdDialog: angular.material.IDialogService,
                   settings: SettingsService) {
    this.fields = dialog.getFields($scope);
    this.fields.forEach((field: AbstractDialogField) => { dialog.fields[field.name] = field });
    this.builder = null; /* HeatTransactionBuilder */

    this.visualization_delay = settings.get(SettingsService.TRANSACTION_PROCESSING_VISUALIZATION);

    this.dialogCancel = function () {
      $mdDialog.cancel();
    }
    this.dialogHide = function () {
      $mdDialog.hide(this.builder.transactionId);
    }

    /* Indicates if all fields are valid and the form can submit */
    this.reset = function () {
      this.state = GenericDialogState.EDIT;
      this.error = null;
      this.message = null;
      this.broadcastState = null;
      this.secondaryMessage = null;
      for (var i=0; i<this.fields.length; i++) {
        this.fields[i].value = undefined;
      }
    }
    this.maybeClose = function () {
      if (dialog.instantSend) {
        this.dialogCancel();
      }
    }
    this.okBtn = function () {
      this.builder = dialog.getTransactionBuilder();

      this.state = GenericDialogState.CREATE;
      this.busy = true;
      this.error = false;
      this.message = null;
      var promise = utils.delayPromise(this.builder.create(), this.visualization_delay);

      promise.then(
        () => {
          if (this.cancelled) return;

          promise = utils.delayPromise(this.builder.sign(), this.visualization_delay);
          $scope.$evalAsync(() => {
            this.state = GenericDialogState.SIGN;

            promise.then(
              () => {
                if (this.cancelled) return;
                this.broadcast();
              },
              (error: ITransactionBuilderSignError) => {
                $scope.$evalAsync(() => {
                  this.busy = false;
                  this.error = true;
                  this.message = error.description;
                });
              }
            );
          });
        },
        (error: ServerEngineError) => {
          $scope.$evalAsync(() => {
            this.busy = false;
            this.error = true;
            this.message = error.description;
          });
        }
      );
    }
    this.cancelBtn = function () {
      this.cancelled = true;
      this.dialogCancel();
    }
    this.broadcast = function () {
      var promise = utils.delayPromise(this.builder.broadcast(), this.visualization_delay);
      $scope.$evalAsync(() => {
        this.busy = true;
        this.error = false;
        this.state = GenericDialogState.BROADCAST;
        this.broadcastState = null;

        promise.then(
          (response: ITransactionBuilderBroadcastResponse) => {
            if (this.cancelled) return;

            $scope.$evalAsync(() => {
              this.busy = false;

              /* API response took longer than SettingsService.SOCKET_RPC_TIMEOUT */
              if (response.internalTimeout) {
                this.error = true;
                this.broadcastState = GenericDialogBroadcastState.INTERNAL_TIMEOUT;
                this.message = 'Internal timeout';
                this.secondaryMessage = 'Click to retry';
              }

              /* Either returned fullHash or transaction id did not match, not sure if ever posible
                but might well be a detection mechanism for when someone is intercepting and/or
                changing transaction broadcasts */
              else if (response.internalError) {
                this.error = true;
                this.broadcastState = GenericDialogBroadcastState.INTERNAL_ERROR;
                this.message = 'Internal error';
                this.secondaryMessage = 'Unable to confirm broadcast succeeded';
              }

              /* Socket service received a standard API error, message contains error description */
              else if (response.serverError) {
                this.error = true;
                this.broadcastState = GenericDialogBroadcastState.SERVER_ERROR;
                this.message = 'Server error';
                this.secondaryMessage = response.serverError;
              }

              /* Close by itself on instant send */
              else /* if (this.instantSend) */ {
                setTimeout(() => { this.dialogHide() }, 666);

                /* Temporary measure to update views while we dont have websocket push notifications yet */
                var HTTPNotify = <HTTPNotifyService> heat.$inject.get('HTTPNotify');
                HTTPNotify.notify();

              }
            });
          }
        );
      });
    }
    /* Instant send enabled */
    if (this.instantSend) {
      this.okBtn();
    }
  }
}