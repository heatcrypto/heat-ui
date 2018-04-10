module dialogs {

  function newEtherWallet($event) {
    $mdDialog().hide();
    dialogs.newEtherWallet($event);
  }

  function importEtherWallet($event) {
    $mdDialog().hide();
    dialogs.importEtherWallet($event);
  }

  export function connectEtherWallet($event) {
    return dialogs.dialog({
      id: 'connectEtherWallet',
      title: "Connect to Etherereum wallet",
      targetEvent: $event,
      cancelButton: true,
      okButton: false,
      locals: {
        event: $event,
        newEtherWallet: newEtherWallet,
        importEtherWallet: importEtherWallet
      },
      style: `
        .dialog-block-buttons {
          width: 170px;
        }
      `,
      template: `
      <div layout="row" layout-align="center center" style="min-height: 25px">
        <md-button class="md-primary dialog-block-buttons" aria-label="Import wallet" ng-click="vm.importEtherWallet(event)">Import my wallet</md-button><br>
        <md-button class="md-primary dialog-block-buttons" aria-label="Create wallet" ng-click="vm.newEtherWallet(event)">Create new wallet</md-button>
      </div>
      `
    });
  }
}