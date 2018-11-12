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
  export function about($event) {
    var settings = <SettingsService> heat.$inject.get('settings');
    dialogs.dialog({
      id: 'about',
      title: 'About',
      targetEvent: $event,
      template: `
        <p>{{vm.applicationName}} {{vm.applicationVersion}}<br>Build: {{vm.applicationBuild}}</p>
        <p>Embedded HEAT server {{vm.heatServerVersion}}</p>
        <p><a href="#" ng-click="vm.goTo('main')">Go to MAIN NET</a></p>
        <p><a href="#" ng-click="vm.goTo('test')">Go to TEST NET</a></p>
        <p><a href="#" ng-click="vm.goTo('beta')">Go to BETA NET</a></p>
        <br>
        <p>Ethereum API <u>Powered by <a href="https://ethplorer.io">Ethplorer.io</a></u></p>
        <!--
        <p><button onclick="gtag_report_conversion_signup(undefined)">Signup Test</button></p>
        <p><button onclick="gtag_report_conversion_bid(undefined, Date.now()+'')">Bid Test</button></p>
        <p><button onclick="gtag_report_conversion_signup_SECURE(undefined)">Signup Test [SECURE]</button></p>
        <p><button onclick="gtag_report_conversion_bid_SECURE(undefined, Date.now()+'')">Bid Test [SECURE]</button></p>
        -->

      `,
      locals: {
        applicationName: settings.get(SettingsService.APPLICATION_NAME),
        applicationVersion: settings.get(SettingsService.APPLICATION_VERSION),
        applicationBuild: settings.get(SettingsService.APPLICATION_BUILD),
        heatServerVersion: SettingsService.EMBEDDED_HEATLEDGER_VERSION,
        isTestnet: window.localStorage.getItem('testnet')=='true',
        goTo: (net) => {
          // defaults to main net
          window.localStorage.setItem('testnet','false');
          window.localStorage.setItem('betanet','false');
          if (net == 'test') {
            window.localStorage.setItem('testnet','true');
          }
          else if (net == 'beta') {
            window.localStorage.setItem('betanet','true');
          }
          window.location.reload();
        }
      }
    })
  }
}
