module dialogs {

  function withdraw(_to: string, _amount:any) {
    var lightwalletService = <LightwalletService> heat.$inject.get('lightwalletService');
    var user = <UserService> heat.$inject.get('user')
    lightwalletService.sendEther(user.currency.address, _to, _amount);
    $mdDialog().hide();
  }

  export function withdrawEther($event) {
    return dialogs.dialog({
      id: 'withdrawEtherWallet',
      title: "Withdraw Ether",
      targetEvent: $event,
      cancelButton: true,
      okButton: false,
      locals: {
        withdraw: withdraw,
        recipient: undefined,
        amount: undefined
      },
      style: `
      .fee-button {
        max-width:140px !important;
      }
    `,
      template: `
        <md-input-container flex>
          <input ng-model="vm.recipient" name="recipient" placeholder="Recipient address" autocomplete="off" required />
        </md-input-container>
        <md-input-container flex>
          <input ng-model="vm.amount" name="amount" placeholder = "Amount (in Wei)" autocomplete="off" required />
        </md-input-container>
        <md-button ng-click="0" ng-disabled="true" class="fee fee-button">Fee: 0.000420 ETH</md-button>
        <div layout="row" layout-align="center center" style="min-height: 25px">
          <md-button class="md-primary" ng-disabled="!vm.amount || !vm.recipient" ng-href="#/ethwallet" ng-click="vm.withdraw(vm.recipient, vm.amount)">Send</md-button>
        </div>
      `
    });
  }
}