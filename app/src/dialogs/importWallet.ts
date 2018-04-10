module dialogs {

  function connect(seed: string) {
    var wallet = <LightwalletService> heat.$inject.get('lightwalletService');
    wallet.getUserEtherWallet(seed);
    $mdDialog().hide();
  }

  export function importEtherWallet($event) {
    return dialogs.dialog({
      id: 'importEtherWallet',
      title: "Import Etherereum Wallet",
      targetEvent: $event,
      cancelButton: true,
      okButton: false,
      locals: {
        seed: undefined,
        connect: connect
      },
      template: `
      <md-input-container flex>
        <input type="text"  ng-model="vm.seed" placeholder="Seed Phrase" autocomplete="off" required ></input><br>
      </md-input-container>

      <div layout="row" layout-align="center center" style="min-height: 25px">
        <md-button class="md-primary" ng-disabled="!vm.seed" ng-click="vm.connect(vm.seed)">Connect</md-button>
      </div>
      `
    });
  }
}