module dialogs {

  export function showEtherDepositDialog($event, address: string) {
    var clipboard = <ClipboardService> heat.$inject.get('clipboard');
    return dialogs.dialog({
      id: 'showEtherDepositDialog',
      title: "Deposit Ether",
      targetEvent: $event,
      cancelButton: false,
      okButton: true,
      locals: {
        userEtherWalletAddress: address,
        copyAddress: function () {
          clipboard.copyWithUI(document.getElementById('deposit-dialog-eth-address-element'), 'Copied address to clipboard');
        }
      },
      template: `
        <div layout="column" flex>
          Deposit the desired amount of Ether(ETH) to your Ethereum Address
          <b id="deposit-dialog-eth-address-element"> {{vm.userEtherWalletAddress}} </b>&nbsp;
          <a ng-click="vm.copyAddress()">[copy]</a>&nbsp;
        </div>
      `
    });
  }
}