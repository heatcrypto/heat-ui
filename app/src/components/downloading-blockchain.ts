/*
 * The MIT License (MIT)
 * Copyright (c) 2019 Heat Ledger Ltd.
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
@Component({
  selector: 'downloadingBlockchain',
  template: `
    <div layout="column" flex layout-fill ng-show="vm.showComponent">
      <md-progress-linear md-mode="indeterminate"></md-progress-linear>
      <center><div><b>Attention!!</b></div>
      <div>Downloading blockchain last block height: {{vm.lastBlockHeight}}, time {{vm.lastBlockTime}}</div></center>
    </div>
  `
})
@Inject('$rootScope', '$scope','heat','$interval','settings', '$router')
class DownloadingBlockchainComponent {
  showComponent = false;
  lastBlockHeight = 0;
  lastBlockTime = 0;
  heatServerLocation;
  constructor(private $rootScope: angular.IScope,
              private $scope: angular.IScope,
              private heat: HeatService,
              private $interval: angular.IIntervalService,
              private settings: SettingsService,
              private router) {
    this.refresh();

    let interval = $interval(()=>{ this.refresh() }, 60*1000, 0, false);
    let checkServerHealthInterval = $interval(()=>{ this.checkServerHealth(this.settings) }, 33*1000, 0, false);

    $scope.$on('$destroy',()=>{
      $interval.cancel(interval);
      $interval.cancel(checkServerHealthInterval);
    });

    //Check servers health to choose the right
    //wait for loading  failover-config.json
    setTimeout(() => {
      if (SettingsService.getFailoverDescriptor())
        this.checkServerHealth(this.settings, true);
      else
        setTimeout(() => {
          this.checkServerHealth(this.settings, true);
        }, 500)
    }, 200);
  }

  refresh() {
    this.heat.api.getBlockchainStatus().then(status=>{
      this.$scope.$evalAsync(()=>{
        let format = this.settings.get(SettingsService.DATEFORMAT_DEFAULT);
        let date = utils.timestampToDate(status.lastBlockTimestamp);
        this.lastBlockTime = dateFormat(date, format);
        this.lastBlockHeight = status.numberOfBlocks;
        if ((Date.now() - date.getTime()) > 1000 * 60 * 60) {
          this.showComponent = true;
        }
        else {
          this.showComponent = false;
        }
      })
    }, ()=>{
      this.$scope.$evalAsync(()=>{
        this.showComponent = false;
      })
    })
  }

  /**
   * Failover procedure.
   * Compares health of known servers with current server.
   * If other health is significantly over current server health then switches to other server.
   */
  checkServerHealth(settings: SettingsService, firstTime?: boolean) {
    let knownServers: ServerDescriptor[] = SettingsService.getFailoverDescriptor().knownServers || [];

    let currentServerHealth: IHeatServerHealth;
    let promises = [];
    knownServers.forEach(server => {
      promises.push(
        this.heat.api.getServerHealth(server.host, server.port).then(health=> {
          server.health = health;
          server.statusError = null;
        }).catch(function (err) {
          server.health = null;
          server.statusError = err;
          return err;
        })
      )
    });

    let minEqualityServersNumber = heat.isTestnet ? 3 : 10;

    Promise.all(promises).then(() => {
      let currentServerIsAlive = false;
      let currentServer = null;

      //find the health of the current server
      knownServers.forEach(server => {
        let health: IHeatServerHealth = server.health;
        server.statusScore = null;
        if (health)
          server.statusScore = 0; // has health means has min score
        if (server.host == settings.get(SettingsService.HEAT_HOST) && server.port == settings.get(SettingsService.HEAT_PORT)) {
          currentServerHealth = health;
          currentServer = server;
          if (!this.heatServerLocation)
            this.notifyOnServerLocationUpdating(currentServer);
          //if the server response is nothing then server is down
          currentServerIsAlive = !server.statusError;
          server.statusScore = currentServerIsAlive ? 0 : null;
        }
      });

      if (!currentServer)
        return;

      if (currentServerIsAlive && ! currentServerHealth)
        return;  //has no health (old version or monitoring API is disabled) so nothing to compare

      //compare health of other servers with health of the current server
      knownServers.forEach(server => {
        let health: IHeatServerHealth = server.health;
        if (!health || !currentServerHealth || !(health.balancesEquality[1] >= minEqualityServersNumber))
          return;

        let blocksEstimation = this.calculateBlockchainEstimation(currentServerHealth, health);
        let balancesEqualityEstimation = this.calculateBalancesEqualityEstimation(currentServerHealth, health);
        let peerEstimation = this.calculatePeerEstimation(currentServerHealth, health);

        server.statusScore = (blocksEstimation == 1 && balancesEqualityEstimation >= 0 && peerEstimation >= 0)
          ? blocksEstimation + balancesEqualityEstimation + peerEstimation
          : 0;
      });

      let best: ServerDescriptor = currentServer;
      let causeToSelectBest;
      knownServers.forEach(server => {
        if (best == currentServer && !currentServerIsAlive) {
          best = server; //if current server is not alive switch to other server in any case
          let se = currentServer.statusError;
          causeToSelectBest = "Сurrent server is not alive"
            + (se.code ? ". Code: " + se.code : "") + (se.description ? ". Description: " + se.description : "");
        }
        if (server.statusScore >= 0 || !currentServerIsAlive) {
          if ((server.statusScore != null && best.statusScore == null) || server.statusScore > best.statusScore) {
            best = server;
            causeToSelectBest = "Status score is better";
          }
          if (server.statusScore == best.statusScore && server.priority < best.priority && best != currentServer) {
            best = server;
            causeToSelectBest = "Server priority";
          }
        }
      });
      if (best && best != currentServer) {
        let bestIsAlive = !best.statusError;
        if (bestIsAlive) {
          settings.setCurrentServer(best);
          this.notifyOnServerLocationUpdating(best);
          this.heat.resetSubscriber();
          if (firstTime) {
            //on initializing (first time) switched silently and starts from login page
            this.router.navigate('/login');
          } else {
            let message = currentServer
              ? "Client API address switched from \n" + currentServer.host + ":" + currentServer.port
                + "\nto\n" + best.host + ":" + best.port
              : "Client API address switched to\n" + best.host + ":" + best.port;
            if (causeToSelectBest)
              message = message + " \n\n" + "Reason: " + causeToSelectBest;
            alert(message);
          }
        }
      }
    })
  }

  /**
   * If returned value is greater 0 it means the blockchain from health is "better" than blockchain from currentServerHealth.
   */
  calculateBlockchainEstimation(currentServerHealth: IHeatServerHealth, health: IHeatServerHealth): number {
    let cumulativeDifficulty = new BigInteger(health.cumulativeDifficulty);
    let difficultyDelta = cumulativeDifficulty.compareTo(new BigInteger(currentServerHealth.cumulativeDifficulty));
    let threshold = SettingsService.getFailoverDescriptor().heightDeltaThreshold;
    if (Math.abs(health.lastBlockHeight - currentServerHealth.lastBlockHeight) > threshold) {
      if (difficultyDelta > 0)
        return 1;
      if (difficultyDelta < 0)
        return -1;
    }
    return 0;
  }

  calculateBalancesEqualityEstimation(currentServerHealth: IHeatServerHealth, health: IHeatServerHealth): number {
    let mismatches = health.balancesEquality[0] / health.balancesEquality[1];
    let currentServerMismatches = currentServerHealth.balancesEquality[0] / currentServerHealth.balancesEquality[1];
    let mismatchesThreshold = SettingsService.getFailoverDescriptor().balancesMismatchesThreshold;
    let equalityThreshold = SettingsService.getFailoverDescriptor().balancesEqualityThreshold;
    return (mismatches < mismatchesThreshold * currentServerMismatches
      && health.balancesEquality[2] > equalityThreshold * currentServerHealth.balancesEquality[2])
      ? 1
      : (mismatches > currentServerMismatches || health.balancesEquality[2] < 0.7 * currentServerHealth.balancesEquality[2])
        ? -1
        : 0;
  }

  calculatePeerEstimation(currentServerHealth: IHeatServerHealth, health: IHeatServerHealth): number {
    let connected = health.peersIndicator.connected / health.peersIndicator.all;
    let currentServerConnected = currentServerHealth.peersIndicator.connected / currentServerHealth.peersIndicator.all;
    let threshold = SettingsService.getFailoverDescriptor().connectedPeersThreshold;
    return (threshold * connected > currentServerConnected)
      ? 1
      : (connected < 0.8 * currentServerConnected)
        ? -1
        : 0;
  }

  private notifyOnServerLocationUpdating(sd: ServerDescriptor) {
    this.heatServerLocation = sd.host + ":" + sd.port;
    this.$rootScope.$emit('HEAT_SERVER_LOCATION', this.heatServerLocation);
  }

}
