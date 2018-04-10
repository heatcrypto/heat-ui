module dialogs {

  export function etherTransactionReceipt(status, message) {
    return dialogs.dialog({
      id: 'EtherTransactionReceipt',
      title: "Transaction Receipt",
      cancelButton: false,
      okButton: true,
      locals: {
        status: status,
        message: message
      },
      template: `
        <h2>{{vm.status}}</h2><br>
        <label ng-if="vm.status==='Success'">Transaction hash is: {{vm.message}}</label>
        <label ng-if="vm.status==='Error'">{{vm.message}}</label>
      `
    });
  }
}