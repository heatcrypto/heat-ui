@Component({
  selector: 'ardorTraderBalances',
  inputs: ['currencyInfo','assetInfo'],
  template: `
    <div layout="row" class="trader-component-title">Account&nbsp;
      <span flex></span>
      <elipses-loading ng-show="vm.loading"></elipses-loading>
    </div>
    <md-list>
      <md-list-item class="header">
        <div class="truncate-col symbol-col">Asset</div>
        <div class="truncate-col balance-col right-align" flex>Balance</div>
      </md-list-item>
      <md-virtual-repeat-container  flex layout-fill layout="column" virtual-repeat-flex-helper  class="content">
        <md-list-item md-virtual-repeat="item in vm.assetBalances">
          <div class="truncate-col symbol-col" >{{item.symbol}}</div>
          <div class="truncate-col balance-col right-align" flex>{{item.balance}}</div>
        </md-list-item>
      </md-virtual-repeat-container>
    </md-list>
  `
})
@Inject('$scope','user','ardorAssetInfo','$q', 'ardorBlockExplorerService')
class ArdorTraderBalancesComponent {

  /* @inputs */
  currencyInfo: AssetInfo; // @input
  assetInfo: AssetInfo; // @input

  assetBalances: Array<any> = [];

  constructor(private $scope: angular.IScope,
              private user: UserService,
              private assetInfoService: ArdorAssetInfoService,
              private $q: angular.IQService,
              private ardorBlockExplorerService: ArdorBlockExplorerService) {
    let ready = () => {
      if (this.currencyInfo && this.assetInfo) {
        var refresh = utils.debounce((angular.bind(this, this.loadBalances)), 1*1000, false);
        this.loadBalances();
        unregister.forEach(fn=>{fn()});
      }
    }
    let unregister = [$scope.$watch('vm.currencyInfo',ready),$scope.$watch('vm.assetInfo',ready)];
  }

  loadBalances() {

    this.ardorBlockExplorerService.getBalance(this.user.account, 2).then(balance => {
      this.assetBalances.push({symbol: 'IGNIS', balance: new Big(utils.convertToQNTf(balance)).toFixed(8), name:'IGNIS'})
      this.assetInfo.userBalance = balance
    })

    this.ardorBlockExplorerService.getAccountAssets(this.user.account).then((assets) => {
      this.$scope.$evalAsync(() => {
        var promises = [];
        assets.forEach((balance: IHeatAccountBalance|any) => {
          promises.push(
            this.assetInfoService.getInfo(balance.asset).then((info)=>{
              this.$scope.$evalAsync(() => {
                balance.symbol = info.symbol;
                balance.name = info.name;
                balance.balance = utils.formatQNT(balance.quantityQNT, info.decimals).replace(/.00000000$/,'');;
                this.assetBalances.push(balance)
              });
            })
          );
          balance.symbol = '*';
          balance.name = '*';
          balance.balance = '*';

          if (this.currencyInfo.id == balance.asset)
            this.currencyInfo.userBalance = balance.quantityQNT;
          if (this.assetInfo.id == balance.asset)
            this.assetInfo.userBalance = balance.quantityQNT;
        });
        Promise.all(promises).then(()=>{
          this.$scope.$evalAsync(() => {
            this.assetBalances.sort((a:any,b:any)=> {
              if (a.symbol < b.symbol) return 1;
              if (a.symbol > b.symbol) return -1;
              return 0;
            });
          });
        });
      })
    });
  }
}
