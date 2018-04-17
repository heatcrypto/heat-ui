module dialogs {

  var seed;

  function createNewWallet() {
    var wallet = <LightwalletService> heat.$inject.get('lightwalletService');
    wallet.getUserEtherWallet(seed);
    $mdDialog().hide();
  }

  function generateSeed() {
    var wallet = <LightwalletService> heat.$inject.get('lightwalletService');
    seed = wallet.generateRandomSeed();
  }

  export function newEtherWallet($event) {
    generateSeed();
    return dialogs.dialog({
      id: 'newEtherWallet',
      title: "New Etherereum Wallet",
      targetEvent: $event,
      cancelButton: true,
      okButton: false,
      locals: {
        createNewWallet: createNewWallet,
        generateSeed: generateSeed
      },
      template: `
        <label>${seed}</label><br>
        <div layout="row" layout-align="center center" style="min-height: 25px">
          <md-button class="md-primary" ng-click="vm.createNewWallet()">Connect</md-button>
        </div>
      `
    });
  }
}