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
declare var saveAs: any;
@RouteConfig('/login')
@Component({
  selector: 'login',
  template: `
    <div layout="column" flex layout-align="start center">
      <div layout="column" layout-padding class="outer-container">
        <div layout="column" layout-align="start center" layout-padding>
          <img src="assets/heatwallet.png" class="wallet">
        </div>
        <div layout="column" flex>

          <!-- SIGNIN, CREATE & ADD buttons -->
          <div layout="column" flex ng-if="!vm.page">
            <div layout="row" layout-align="center center">
              <md-button class="md-primary md-raised" ng-click="vm.page='signin'" aria-label="Sign in" ng-show="vm.localKeys.length">
                <md-tooltip md-direction="bottom">Sign in with your Password (or Pin Code)</md-tooltip>
                Sign in
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.page='create';vm.generateNewSecretPhrase()" aria-label="Create">
                <md-tooltip md-direction="bottom">Create a new account</md-tooltip>
                Create
              </md-button>
              <md-button class="md-warn md-raised" ng-click="vm.page='add'" aria-label="Add">
                <md-tooltip md-direction="bottom">Add existing account</md-tooltip>
                Add
              </md-button>
            </div>
          </div>

          <!-- SIGNIN page (dropdown shows keys in wallet, must enter pin) -->
          <div layout="column" flex ng-if="vm.page=='signin'">
            <div layout="column" flex>
              <md-input-container>
                <label>Account</label>
                <md-select ng-model="vm.pageSigninAccount" ng-change="vm.pageSigninPincode=null;">
                  <md-option ng-repeat="key in vm.localKeys" value="{{key.account}}">{{key.name||key.account}}</md-option>
                </md-select>
              </md-input-container>
            </div>
            <div layout="column" flex>
              <md-input-container flex ng-show="vm.pageSigninAccount">
                <label>Password (or Pin Code)</label>
                <input type="password" ng-model="vm.pageSigninPincode" required name="pincode" maxlength="15">
              </md-input-container>
            </div>
            <div layout="row" layout-align="center center" ng-show="vm.pageSigninWrongPincode">
              <b>sorry, buts that the wrong pincode</b>
            </div>
            <div layout="row" layout-align="center center">
              <md-button class="md-primary md-raised" ng-click="vm.page=''" aria-label="Back">Options</md-button>
              <md-button class="md-primary md-raised" ng-click="vm.pageSinginLogin()"
                ng-disabled="!vm.pageSigninPincode||!vm.pageSigninAccount" aria-label="Continue in">Sign in</md-button>
            </div>
          </div>

          <!-- CREATE page (0) -->
          <div layout="column" flex ng-if="vm.page=='create'">
            <div layout="row" flex layout-align="center center">
              <md-input-container flex>
                <label>User name</label>
                <input ng-model="vm.pageCreateUserName" required name="username" maxlength="100" input-append="@heatwallet.com">
              </md-input-container>
              <md-input-container flex style="max-width:120px !important">
                <md-icon md-font-set="regular-font">@heatwallet.com</md-icon>
                <input style="visibility: hidden;">
              </md-input-container>
            </div>
            <div layout="column" flex>
              <md-input-container flex>
                <label>Secret phrase</label>
                <textarea rows="2" flex ng-model="vm.pageCreateSecretPhrase" readonly ng-trim="false" id="create-new-textarea"></textarea>
                <!--
                <md-icon md-font-library="material-icons" ng-click="vm.copy('create-new-textarea', 'Secret phrase copied')" class="clickable-icon">
                  <md-tooltip md-direction="right">Copy to clipboard</md-tooltip>content_copy
                </md-icon>
                -->
              </md-input-container>
            </div>
            <div layout="column" flex>
              <md-input-container flex>
                <label>Password (or Pin Code) (required)</label>
                <input type="password" ng-model="vm.pageCreatePincode" required name="pincode" maxlength="15">
              </md-input-container>
            </div>
            <div layout="column" flex>
              <md-radio-group ng-model="vm.pageCreateNameType">
                <md-radio-button value="public" class="md-primary">
                  Publicly searchable email account id
                </md-radio-button>
                <md-radio-button value="private" class="md-primary">
                  Private email account id (sender must know it)
                </md-radio-button>
              </md-radio-group>
            </div>
            <div layout="row" layout-align="center center">
              <md-button class="md-primary md-raised" ng-click="vm.page=''" aria-label="Back">Options</md-button>
              <md-button class="md-warn md-raised" ng-click="vm.generateNewSecretPhrase()" aria-label="Other">
                Renew pass
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.page='create1'"
                ng-disabled="!vm.pageCreateUserName||!vm.pageCreateSecretPhrase||!vm.isValidPincode(vm.pageCreatePincode)"
                aria-label="Continue">Continue</md-button>
            </div>
            <div layout="column" layout-align="center center">
              <br>
              <span class="account-preview">{{vm.pageCreateAccount}}</span>
              <br>
              <span>BIP44 compatible = <b>{{vm.bip44Compatible?'TRUE':'FALSE'}}</b></span>
            </div>
          </div>

          <!-- CREATE page (1) -->
          <div layout="column" flex ng-if="vm.page.indexOf('create')!=-1" ng-show="vm.page=='create1'" layout-padding>
            <div layout="column" flex>
              <p>Although we have absolutely nothing against robots, we still would like to know if you are one.</p>
            </div>
            <div layout="row" flex layout-align="center center">
              <no-captcha ng-if="!vm.useExternalCaptcha" g-recaptcha-response="vm.pageCreateRecaptchaResponse" expired-callback="vm.recaptchaExpired()"></no-captcha>
              <md-button ng-if="vm.useExternalCaptcha" ng-click="vm.doChallenge()" class="md-raised md-primary" ng-disabled="vm.pageCreateRecaptchaResponse">Click here</md-button>
            </div>
            <div layout="row" layout-align="center center">
              <md-button class="md-primary md-raised" ng-click="vm.page='create'" aria-label="Back">Back</md-button>
              <md-button class="md-primary md-raised" ng-click="vm.createAccount();vm.page='create2'" ng-disabled="!vm.pageCreateRecaptchaResponse"
                aria-label="Continue">Create Account</md-button>
            </div>
          </div>

          <!-- CREATE page (2) -->
          <div layout="column" flex ng-if="vm.page.indexOf('create')!=-1" ng-show="vm.page=='create2'">
            <div layout="column" flex layout-padding ng-show="vm.pageCreateLoading">
              <div layout="row" layout-align="space-around">
                <md-progress-circular md-mode="indeterminate"></md-progress-circular>
              </div>
              <span>Creating your account, making it extra special for you.</span>
            </div>
            <div layout="column" layout-align="center center" ng-show="vm.pageCreateError">
              <span>Something went wrong it seems</span>
              <span>This is what we got back from our blockchain minions:</span>
              <span><b>{{vm.pageCreateError}}</b></span>
              <md-button class="md-raised md-primary" ng-click="vm.page='create'" aria-label="Back">Try again</md-button>
            </div>
          </div>

          <!-- CREATE page (3 - success page) -->
          <div layout="column" flex ng-show="vm.pageCreateSuccess">
            <div layout="column" flex layout-align="start center">
              <h2>Congratulations, it worked!</h2>
              <div>We advise you print or write down your HEAT secret passprase, if lost you will loose access to your HEAT.<br>
              Please pick one or more methods to back up your passphrase listed below.</div>
            </div>
            <div layout="row" layout-align="center center">
              <md-button ng-click="vm.printPassphrase()">
                <md-icon md-font-library="material-icons">print</md-icon>
                &nbsp;&nbsp;Print
              </md-button>
              <md-button ng-click="vm.savePassphrase()" ng-if="vm.isFileSaverSupported">
                <md-icon md-font-library="material-icons">save</md-icon>
                &nbsp;&nbsp;Save
              </md-button>
              <md-button ng-click="vm.showPassphrase()">
                <md-icon md-font-library="material-icons">content_copy</md-icon>
                &nbsp;&nbsp;Copy
              </md-button>
              <md-button ng-click="vm.showPassphrase=!vm.showPassphrase">
                <md-icon md-font-library="material-icons">arrow_drop_down_circle</md-icon>
                &nbsp;&nbsp;{{vm.showPassphrase?'Hide':'Reveal'}}
              </md-button>
            </div>
            <div layout="column" layout-align="center center" ng-show="vm.showPassphrase">
              <p>Passphrase for {{vm.pageCreateUserName}} ({{vm.pageCreateAccount}}):</p>
              <p><code id="claim2-passphrase">{{vm.pageCreateSecretPhrase}}</code></p>
            </div>
            <div layout="row" layout-align="center center">
              <md-checkbox ng-model="vm.passphraseBackedUp" aria-label="I have backed up my passphrase">
              I have safely backed up my passphrase
              </md-checkbox>
              <md-button class="md-raised md-primary" ng-click="vm.createLocalAccount($event)" ng-disabled="!vm.passphraseBackedUp">Continue</md-button>
            </div>
          </div>

          <!-- ADD page (choose add secret phrase or open wallet file) -->
          <div layout="column" flex ng-show="vm.page=='add'">
            <div layout="row" layout-align="center center">
              <md-button class="md-warn md-raised" ng-click="vm.page=''" aria-label="Back">
                <md-tooltip md-direction="bottom">Go back one page</md-tooltip>
                Back
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.page='addSecret'" aria-label="Add secret phrase">
                <md-tooltip md-direction="bottom">Add single key through secret phrase</md-tooltip>
                Secret Phrase
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.page='addWallet'" aria-label="Open wallet file">
                <md-tooltip md-direction="bottom">Load wallet file</md-tooltip>
                Wallet File
              </md-button>
            </div>
          </div>

          <!-- ADD page (adds single secret phrase) -->
          <div layout="column" flex ng-show="vm.page=='addSecret'">
            <div layout="column" flex>
              <md-input-container flex>
                <label>Secret phrase</label>
                <textarea rows="2" flex ng-model="vm.pageAddSecretPhrase" ng-trim="false" ng-change="vm.pageAddSecretPhraseChanged()"></textarea>
              </md-input-container>
            </div>
            <div layout="column" flex>
              <md-input-container flex>
                <label>Password (or Pin Code) (required)</label>
                <input type="password" ng-model="vm.pageAddPincode" required name="pincode" maxlength="5">
              </md-input-container>
            </div>
            <div layout="row" layout-align="center center">
              <md-button class="md-warn md-raised" ng-click="vm.page='add'" aria-label="Back">
                <md-tooltip md-direction="bottom">Go back one page</md-tooltip>
                Back
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.pageAddAddSecretPhrase()" ng-disabled="!vm.pageAddSecretPhrase||!vm.pageAddPincode" aria-label="Add">
                <md-tooltip md-direction="bottom">Add and encrypt this secretphrase to your device</md-tooltip>
                Add
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.pageAddLogin()" ng-disabled="!vm.pageAddSecretPhrase" aria-label="Sign in">
                <md-tooltip md-direction="bottom">Sign in without storing your secretphrase</md-tooltip>
                Sign in
              </md-button>
            </div>
            <div layout="column" layout-align="center center">
              <br>
              <span class="account-preview">{{vm.pageAddCalculatedAccountId}}</span>
              <span ng-show="vm.pageAddSecretPhraseHasHiddenChars" class="account-preview">
                Secret phrase has hidden characters!&nbsp;<a href="#" ng-click="vm.pageAddRemoveSecretPhraseHiddenChars()">remove</a>
              </span>
              <br>
              <span>BIP44 compatible = <b>{{vm.bip44Compatible?'TRUE':'FALSE'}}</b></span>
            </div>
          </div>

          <!-- ADD page (opens wallet file) -->
          <div layout="column" flex ng-show="vm.page=='addWallet'">
            <div layout="column" flex>
              <md-input-container flex>
                <input type="file" onchange="angular.element(this).scope().vm.pageAddFileInputChange(this.files)">
              </md-input-container>
            </div>
            <div layout="column" layout-align="center center" ng-show="vm.pageAddWalletInvalid">
              <p><b>Invalid wallet file</b></p>
            </div>
            <div layout="row" layout-align="center center">
              <md-button class="md-warn md-raised" ng-click="vm.page='add'" aria-label="Back">
                <md-tooltip md-direction="bottom">Go back one page</md-tooltip>
                Back
              </md-button>
              <md-button class="md-primary md-raised" ng-click="vm.pageAddWalletImportContinue()" ng-disabled="!vm.pageAddWallet" aria-label="Continue">
                <md-tooltip md-direction="bottom">Click to open wallet explorer</md-tooltip>
                Continue
              </md-button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
@Inject('$scope','$q','user','$location','heat','localKeyStore',
        'secretGenerator','clipboard','$mdToast','env','settings','walletFile','panel','lightwalletService')
class LoginComponent {

  bip44Compatible: boolean = false

  page: string = '';
  isFileSaverSupported: boolean;
  useExternalCaptcha: boolean;
  localKeys: Array<{account:string, name:string}> = [];
  key: ILocalKey = null;
  hasWhitespace = /^\s+|\s+$/gm;
  apiServer: string;
  availableAPIServers = [];

  pageAddSecretPhrase: string;
  pageAddPublicKey: string;
  pageAddAccount: string;
  pageAddPincode: string;
  pageAddSecretPhraseHasHiddenChars: boolean;
  pageAddCalculatedAccountId: string = 'Enter secret phrase to see account id';
  pageAddWallet: IHeatWalletFile;
  pageAddWalletInvalid: boolean = false;

  pageSigninPincode: string;
  pageSigninAccount: string;
  pageSigninWrongPincode: boolean = false;

  pageCreateNameType: string = 'public';
  pageCreateUserName: string = '';
  pageCreateSecretPhrase: string;
  pageCreatePublicKey: string;
  pageCreateAccount: string;
  pageCreatePincode: string;
  pageCreateRecaptchaResponse: string;
  pageCreateRecaptchaWindow: Window;
  pageCreateLoading: boolean = false;
  pageCreateSuccess: boolean = false;
  pageCreateError: string;
  pageCreateTransaction: string;

  constructor(private $scope: angular.IScope,
              private $q: angular.IQService,
              private user: UserService,
              private $location: angular.ILocationService,
              private heat: HeatService,
              private localKeyStore: LocalKeyStoreService,
              private secretGenerator: SecretGeneratorService,
              private clipboard: ClipboardService,
              private $mdToast: angular.material.IToastService,
              private env: EnvService,
              private settings: SettingsService,
              private walletFile: WalletFileService,
              private panel: PanelService,
              private lightwalletService: LightwalletService) {

    try {
      this.isFileSaverSupported = !!new Blob;
    } catch (e) {}
    this.useExternalCaptcha = env.type!=EnvType.BROWSER;
    this.generateNewSecretPhrase();
    this.initLocalKeys();

    if (this.localKeys.length != 0) {
      this.pageSigninAccount = this.localKeys[0].account;
      this.page='signin';
    }
    else {
      this.page='create';
    }
  }

  initLocalKeys() {
    this.localKeys = this.localKeyStore.list().map((account:string) => {
      return {
        name: this.localKeyStore.keyName(account),
        account: account
      }
    });
  }

  apiServerChanged() {
    var parts = this.apiServer.split(":");
    this.settings.put(SettingsService.HEAT_PORT,parts.splice(-1,1)[0]);
    this.settings.put(SettingsService.HEAT_HOST, parts.join(''));
  }

  pageAddRemoveSecretPhraseHiddenChars() {
    this.$scope.$evalAsync(() => {
      this.pageAddSecretPhrase = this.pageAddSecretPhrase.replace(/^\s+/, "").replace(/\s+$/, "");
      this.pageAddSecretPhraseChanged();
    });
  }

  pageAddLogin() {
    this.user.unlock(this.pageAddSecretPhrase, undefined, this.lightwalletService.validSeed(this.pageAddSecretPhrase)).then(() => {
      this.$location.path(`explorer-account/${this.user.account}/transactions`);
    });
  }

  pageAddSecretPhraseChanged() {
    this.pageAddPublicKey = heat.crypto.secretPhraseToPublicKey(this.pageAddSecretPhrase);
    this.pageAddAccount = heat.crypto.getAccountIdFromPublicKey(this.pageAddPublicKey);
    this.pageAddSecretPhraseHasHiddenChars = this.hasWhitespace.test(this.pageAddSecretPhrase);
    this.bip44Compatible = this.lightwalletService.validSeed(this.pageAddSecretPhrase)
    this.$scope.$evalAsync(() => {
      this.pageAddCalculatedAccountId = this.pageAddAccount;
    });
  }

  pageAddAddSecretPhrase() {
    let key = {
      account: this.pageAddAccount,
      secretPhrase: this.pageAddSecretPhrase,
      pincode: this.pageAddPincode,
      name: ''
    };
    this.localKeyStore.add(key);
    this.user.unlock(this.pageAddSecretPhrase, key, this.lightwalletService.validSeed(this.pageAddSecretPhrase)).then(() => {
      this.$location.path(`explorer-account/${this.user.account}/transactions`);
    });
  }

  pageAddFileInputChange(files: FileList) {
    if (files && files[0]) {
      let reader = new FileReader();
      reader.onload = () => {
        this.$scope.$evalAsync(() => {
          this.pageAddWalletInvalid = true;
          let fileContents = reader.result;
          this.pageAddWallet = this.walletFile.createFromText(fileContents);
          if (this.pageAddWallet) {
            this.pageAddWalletInvalid = false;
          }
        })
      };
      reader.readAsText(files[0]);
    }
  }

  pageAddWalletImportContinue() {
    let addedKeys = this.localKeyStore.import(this.pageAddWallet);
    this.initLocalKeys();
    let message = `Imported ${addedKeys.length} keys into this device`;
    this.$mdToast.show(this.$mdToast.simple().textContent(message).hideDelay(5000));
    this.$scope.$evalAsync(()=>{
      this.page = '';
    });
  }

  pageSinginLogin() {
    this.$scope.$evalAsync(()=>{
      this.pageSigninWrongPincode = false;
      var key = this.localKeyStore.load(this.pageSigninAccount, this.pageSigninPincode);
      if (key) {
        this.user.unlock(key.secretPhrase, key, this.lightwalletService.validSeed(key.secretPhrase)).then(() => {
          this.$location.path(`explorer-account/${this.user.account}/transactions`);
        });
      }
      else {
        this.pageSigninWrongPincode = true;
      }
    })
  }

  createAccount() {
    this.$scope.$evalAsync(()=>{
      this.pageCreateLoading = true;
      this.pageCreateError = null;
    });
    var isprivate    = this.pageCreateNameType != 'public';
    var fullNameUTF8 = this.pageCreateUserName.trim();            // UTF-8
    var nameHashStr  = heat.crypto.fullNameToHash(fullNameUTF8);  // UTF-8 0-9+
    var publicKey    = this.pageCreatePublicKey;                  // HEX str
    var input        = isprivate ?
      converters.stringToHexString(nameHashStr + this.pageCreateAccount) :
      converters.stringToHexString(fullNameUTF8 + nameHashStr + this.pageCreateAccount);
    heat.crypto.SHA256.init();
    heat.crypto.SHA256.update(converters.hexStringToByteArray(input));
    var message      = converters.byteArrayToHexString(heat.crypto.SHA256.getBytes());
    var signatureArg = heat.crypto.signBytes(message, converters.stringToHexString(this.pageCreateSecretPhrase));
    if (!heat.crypto.verifyBytes(signatureArg, message, publicKey)) {
      throw new Error("Cant verify own signature");
    }
    this.heat.api.registerAccountName(this.pageCreatePublicKey, this.pageCreateRecaptchaResponse, fullNameUTF8, isprivate, signatureArg).then(
      (transaction: string) => {
        this.$scope.$evalAsync(()=>{
          this.pageCreateLoading = false;
          this.pageCreateSuccess = true;
        });
      },
      (error: ServerEngineError) => {
        this.$scope.$evalAsync(()=>{
          this.pageCreateLoading = false;
          this.pageCreateError = error.description;
        });
      }
    );
  }

  isValidPincode(pincode) {
    return /^[a-zA-Z0-9_.-]{4,15}$/.test(pincode);
  }

  generateNewSecretPhrase() {
    this.secretGenerator.generate('en').then((secretPhrase) => {
      this.$scope.$evalAsync(() => {
        this.pageCreateSecretPhrase = secretPhrase;
        this.pageCreatePublicKey = heat.crypto.secretPhraseToPublicKey(secretPhrase);
        this.pageCreateAccount = heat.crypto.getAccountIdFromPublicKey(this.pageCreatePublicKey);
        this.bip44Compatible = this.lightwalletService.validSeed(secretPhrase)
      });
    });
  }

  printPassphrase() {
    var html = '<html><head>' +
      '<style type="text/css">html{font-family:GillSans,Calibri,Trebuchet,sans-serif;}</style>' +
      '</head><body>'+this.templateHTML()+'</body></html>';
    var popup = window.open(`data:text/html;base64,${btoa(html)}`,
      '_blank', 'toolbar=0,location=0,menubar=0');
    // @ts-ignore
    popup.print();
    popup.close();
  }

  savePassphrase() {
    var blob = new Blob([this.templateText()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, `heatledger-${this.pageCreateUserName}-${this.pageCreateAccount}.txt`);
  }

  showPassphrase() {
    this.panel.show(`
      <div layout="column" flex class="toolbar-copy-passphrase">
        <md-input-container flex>
          <textarea rows="2" flex ng-bind="vm.secretPhrase" readonly ng-trim="false"></textarea>
        </md-input-container>
      </div>
    `, {
      secretPhrase: this.pageCreateSecretPhrase
    })
  }

  templateText() {
    return [
      'When stored the passphrase in this document will forever give you access to your HEAT funds.',
      '',
      `Account: ${this.pageCreateUserName} (${this.pageCreateAccount})`,
      '',
      'Passphrase:',
      this.pageCreateSecretPhrase,
      '',
      `Publickey:`,
      this.pageCreatePublicKey,
      '',
      'https://heatwallet.com'].join('\r\n');
  }

  templateHTML() {
    return [
      '<h1>HEAT Paper Wallet</h1>',
      '',
      'When stored the passphrase in this document will forever give you access to your HEAT funds.',
      '',
      `Paper wallet for <b>${this.pageCreateUserName}</b> (${this.pageCreateAccount})`,
      '',
      'Passphrase:',
      `<u>${this.pageCreateSecretPhrase}</u>`,
      '',
      `Publickey:`,
      this.pageCreatePublicKey,
      '',
      '<a href="https://heatwallet.com" target="_blank">https://heatwallet.com</a>'].join('<br>');
  }

  createLocalAccount() {
    let key = {
      account: this.pageCreateAccount,
      secretPhrase: this.pageCreateSecretPhrase,
      pincode: this.pageCreatePincode,
      name: this.pageCreateUserName
    };
    this.localKeyStore.add(key);
    this.user.unlock(this.pageCreateSecretPhrase, key, this.lightwalletService.validSeed(this.pageCreateSecretPhrase)).then(() => {
      this.$location.path('new');
    });
  }

  copy(element: string, successMsg: string) {
    this.clipboard.copyWithUI(document.getElementById(element), successMsg);
  }

  doChallenge() {
    this.showChallenge().then((response : string) => {
      this.$scope.$evalAsync(() => {
        this.pageCreateRecaptchaResponse = response;
      });
    })
  }

  showChallenge() : angular.IPromise<string> {
    let deferred = this.$q.defer<string>();
    if (angular.isDefined(this.pageCreateRecaptchaWindow)) {
      this.pageCreateRecaptchaWindow.close();
      this.pageCreateRecaptchaWindow = null;
    }
    var url = this.settings.get(SettingsService.CAPTCHA_POPUP);
    this.pageCreateRecaptchaWindow = <Window> window.open(url,"New Window", "width=600,height=600,resizable=1,modal=1");
    var resolved = false;
    window.addEventListener("message", (event) => {
      try {
        var data = JSON.parse(event.data);
        switch (data.messageType) {
          case "token": {
            if (angular.isString(data.message.response)) {
              resolved = true;
              deferred.resolve(data.message.response);
              this.pageCreateRecaptchaWindow.close();
            }
            break;
          }
          case "beforeunload": {
            if (!resolved) {
              resolved = true;
              deferred.resolve(null);
            }
          }
        }
      } catch (e) {
        console.log('Postmessage parse error', e);
      }
    }, false);
    return deferred.promise;
  }
}
