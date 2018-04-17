module dialogs {

  export function showEtherDepositDialog($event, address: string) {
    return dialogs.dialog({
      id: 'showEtherDepositDialog',
      title: "Deposit Ether",
      targetEvent: $event,
      cancelButton: false,
      okButton: true,
      locals: {
        userEtherWalletAddress: address
      },
      template: `
        <div layout="column" flex>
          Deposit the desired amount of Ether(ETH) to your Ethereum Address <b> {{vm.userEtherWalletAddress}} </b>
        </div>
      `
    });
  }
}