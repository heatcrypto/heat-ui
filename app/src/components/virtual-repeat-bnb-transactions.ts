///<reference path='VirtualRepeatComponent.ts'/>

@Component({
	selector: 'virtualRepeatBnbTransactions',
	inputs: ['account'],
	template: `
		<div layout="column" flex layout-fill>
			<div layout="row" class="trader-component-title" ng-hide="vm.hideLabel">Latest Transactions
			</div>
			<md-list flex layout-fill layout="column">
				<md-list-item class="header">
					<!-- DATE -->
					<div class="truncate-col date-col left">Time</div>
					<!-- TX ID  -->
					<div class="truncate-col tx-col left">Transaction ID</div>
					<!-- FROM -->
					<div class="truncate-col info-col left">FROM</div>
					<!-- TO -->
					<div class="truncate-col info-col left">TO</div>
					<!-- AMOUNT -->
					<div class="truncate-col amount-col right">Amount</div>
					<!-- MESSAGE -->
					<div class="truncate-col message-col left">Message</div>
					<!-- JSON -->
					<div class="truncate-col json-col"></div>
				</md-list-item>
				<md-virtual-repeat-container md-top-index="vm.topIndex" flex layout-fill layout="column" virtual-repeat-flex-helper>
					<md-list-item md-virtual-repeat="item in vm" md-on-demand aria-label="Entry" class="row">
						<!-- DATE -->
						<div class="truncate-col date-col left">{{item.dateTime}}</div>
						<!-- TX ID -->
						<div class="truncate-col tx-col left" >
							<span>
								<a target="_blank" href="https://testnet-explorer.binance.org/tx/{{item.txid}}">{{item.txid}}</a>
							</span>
						</div>
						<!-- FROM -->
						<div class="truncate-col info-col left">
						<span>{{item.from}}</span>
						</div>
						<!-- TO -->
						<div class="truncate-col info-col left">
							<span>{{item.to}}</span>
							<!-- <span ng-show = "item.to !== 'Multiple Outputs'">{{item.to}}</span> -->
							<!-- <a ng-show = "item.to === 'Multiple Outputs'" ng-click="vm.jsonDetails($event, item.json)">{{item.to}}</a> -->
						</div>
						<!-- AMOUNT -->
						<div class="truncate-col amount-col right">
							<span>{{item.amount}}</span>
						</div>
						<!-- MESSAGE -->
						<div class="truncate-col message-col left">
						  <span>{{item.displayMessage}}</span>
						</div>
						<!-- JSON -->
						<div class="truncate-col json-col">
							<a ng-click="vm.jsonDetails($event, item.json)">
								<md-icon md-font-library="material-icons">code</md-icon>
							</a>
						</div>
					</md-list-item>
				</md-virtual-repeat-container>
			</md-list>
		</div>
	`
})
  
@Inject('$scope', '$q', 'bnbTransactionsProviderFactory', 'settings', 'binancePendingTransactions', 'user')
class VirtualRepeatBnbTransactionsComponent extends VirtualRepeatComponent {

	account: string; // @input
	constructor(protected $scope: angular.IScope,
		protected $q: angular.IQService,
		private bnbTransactionsProviderFactory: BnbTransactionsProviderFactory,
		private settings: SettingsService,
		private binancePendingTransactions: BinancePendingTransactionsService,
		private user: UserService) {
		super($scope, $q);
		var format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);

		/* privateKey and publicKey should be HEAT keys */
		let privateKey = this.user.secretPhrase;
		let publicKey = this.user.publicKey;
		this.initializeVirtualRepeat(
			this.bnbTransactionsProviderFactory.createProvider(this.account),
			/* decorator function */
			(transaction: any) => {
				transaction.amount = transaction.value + ' ' + transaction.txAsset;
				transaction.txid = transaction.txHash;
				transaction.dateTime = dateFormat(new Date(transaction.timeStamp), format);

				transaction.from = transaction.fromAddr || '--';
				let inputs = transaction.fromAddr || '--';
				if(transaction.from.length > 38) {
					transaction.from = transaction.from.substr(0, 35).concat('...')
				}
				transaction.to = transaction.toAddr || '--';
				let outputs = transaction.toAddr || '--';
				if(transaction.to.length > 38) {
					transaction.to = transaction.to.substr(0, 35).concat('...')
				}

				transaction.message = transaction.memo
				transaction.displayMessage = transaction.memo;
				if(transaction.displayMessage.length > 13) {
				  transaction.displayMessage = transaction.displayMessage.substr(0, 10).concat('...')
				}
		
				// if BTC were transferred from the unlocked account address then show it as "-Amount"
				if (inputs.includes(this.account)) {
					transaction.amount = `-${transaction.amount}`;
				}

				transaction.json = {
					txid: transaction.txHash,
					time: transaction.dateTime,
					block: transaction.blockHeight,
					fees: transaction.txFee,
					inputs: inputs.trim(),
					outputs: outputs.trim(),
					message: transaction.message ? transaction.message : ''
				}
			}
		);

		var refresh = utils.debounce(angular.bind(this, this.determineLength), 500, false);
		let timeout = setTimeout(refresh, 15 * 1000)
		
		let listener = this.determineLength.bind(this)
		this.PAGE_SIZE = 25;
		binancePendingTransactions.addListener(listener)

		$scope.$on('$destroy', () => {
			binancePendingTransactions.removeListener(listener)
			clearTimeout(timeout)
		})
	}

	jsonDetails($event, item) {
		dialogs.jsonDetails($event, item, 'Transaction: ' + item.txid);
	}

	onSelect(selectedTransaction) { }
}
