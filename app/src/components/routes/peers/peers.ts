/*
 * The MIT License (MIT)
 * Copyright (c) 2024 Heat Ledger Ltd.
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
@RouteConfig('/peers')
@Component({
    selector: 'peers',
    styles: [`
    .item {
        display: inline-block;
    }
    .peer {
        background-color: lightslategrey;
        border-radius: 9px;
        padding: 6px;
        margin: 4px;
    }
    .downloaded {
        border: solid 1px lightgrey;
        border-radius: 6px;
        //padding: 4px;
        //margin: 4px;
        background-color: #b0ffb07a;
        min-width: 5px;    
        min-height: 16px;
        max-height: 16px;
        white-space: nowrap;
        //margin-top: -48px;
    }
    .uploaded {
        border: solid 1px lightgrey;
        border-radius: 6px;
        //padding: 4px;
        //margin: 4px;
        background-color: #7175f552;
        min-width: 5px;    
        min-height: 16px;
        max-height: 16px;
        white-space: nowrap;
        //margin-top: -48px;
    }
    .speed {
        //border: solid 1px lightgrey;
        //border-radius: 4px;
        //padding: 2px;
        margin: 2px;
        //background-color: rgb(255 60 30 / 0.45);
        min-width: 5px;
        max-width: 320px;    
        height: 3px;
        white-space: nowrap;
    }
    .speed {
        -webkit-transition: all 3s; 
        -moz-transition: all 3s; 
        -ms-transition: all 3s; 
        -o-transition: all 3s; 
        transition: all 3s;  
    }
    .connected {
        color: springgreen;  
    }
    .stats {
      display: grid;
      grid-template-columns: auto auto;
      grid-template-rows: auto auto;
      gap: 4px;
      justify-content: start;
      margin-top: 6px;
    }

    .feeder-timeline {
        font-family: monospace;
        -webkit-transition: all 3s; 
        -moz-transition: all 3s; 
        -ms-transition: all 3s; 
        -o-transition: all 3s; 
        transition: all 3s ease-in-out;  
    }
    .last-feeder {
        background-color: rgb(255 128 171 / 40%);
    }
    @keyframes scaleUp {
      0% { transform: scale(0.1); }
      100% { transform: scale(1)}
    }
    .scale-up {
      animation: scaleUp 4s;
    }
  `],
    template: `
    <div layout="column" flex layout-fill style="padding: 8px">
        <h2>Network peers</h2>
        <div style="overflow: scroll">
            <p>Connected to <span style="font-weight: bold;">{{vm.apiServerAddress}}</span>, server version <span style="font-weight: bold;">{{vm.apiServerVersion}}</span></p>
            <p ng-if="vm.apiServerVersion < '4.3.0'">Connected API server should be at least 4.3.0 to provide peers info</p>
            <div ng-repeat="item in vm.peers" class="peer item scale-up">
                <b>{{item.address}}</b> &nbsp;&nbsp;{{item.platform}} &nbsp;&nbsp;{{item.application}} &nbsp;&nbsp;{{item.version}} &nbsp;&nbsp;
                <span ng-if="item.height > 0"><label>height:</label> {{item.height}}</span> &nbsp;&nbsp; <label>was connected:</label> {{item.connectedChangedDate}}
                <div>
                    <span ng-class="{'connected':item.state=='CONNECTED'}">{{item.state}}</span>
                    <span ng-if="item.stateNote">({{item.stateNote}})</span>
                    &nbsp;&nbsp;<span ng-if="item.remoteServerRequestCounter">Server requests: {{item.remoteServerRequestCounter}}</span>
                </div>
                <div class="feeder-timeline" ng-class="{'last-feeder':item.lastFeeder}">{{vm.feederTimeLine(item)}}</div>
                <div class="stats">
                    <div class="item">downloaded {{vm.formatBytes(item.downloaded)}}</div>
                    <div class="downloaded item" style="width: {{item.downloadedRectangle.b}}px;height: {{item.downloadedRectangle.a}}px;">
                        <div>
                            <div class="speed item" style="width: {{0.3 * item.downloadedSpeedMeter.speed}}px;background-color: rgb(180 30 30 / {{0.1 + item.downloadedSpeedMeter.speed/1200}});"></div>
                            <div class="item">speed {{item.downloadedSpeedMeter.speed}} b/s</div>
                        </div>
                    </div>
                    <div class="item">uploaded {{vm.formatBytes(item.uploaded)}}</div>
                    <div class="uploaded item" style="width: {{item.uploadedRectangle.b}}px;height: {{item.uploadedRectangle.a}}px;">
                        <div>
                            <div class="speed item" style="width: {{0.2 * item.uploadedSpeedMeter.speed}}px;background-color: rgb(180 30 30 / {{0.1 + item.uploadedSpeedMeter.speed/1200}});"></div>
                            <div class="item">speed {{item.uploadedSpeedMeter.speed}} b/s</div>
                        </div>
                    </div>
                </div>
        </div>
    </div>
  `
})
@Inject('$rootScope', '$scope', 'heat', 'settings')
class PeersComponent {

    apiServerAddress: string
    apiServerVersion: string
    peerMap: Map<string, PeerView>
    peers: PeerView[]

    constructor(private $rootScope: angular.IScope,
                private $scope: angular.IScope,
                private heat: HeatService,
                private settings: SettingsService) {

        this.peerMap = new Map<string, PeerView>()
    }

    $onInit() {
        let peersCompare = (a, b) => {
            let stateA = a.state == "CONNECTED" ? -1 : 1
            let stateB = b.state == "CONNECTED" ? -1 : 1
            return (stateA - stateB) || a.address?.localeCompare(b.address)
        }

        let onPeerInfo = (peerList: IHeatPeerList) => {
            let now = Date.now()
            peerList.peers.forEach((p) => {
                // @ts-ignore
                let pv: PeerView = Object.assign(this.peerMap.get(p.address) || {}, p)
                pv.updateTime = now
                this.peerMap.set(p.address, pv)
            })

            // remove obsolete peers
            this.peers = Array.from(this.peerMap, ([name, value]) => value)
                .filter(pv => pv.updateTime > now - 60000 && (pv.downloaded > 0 || pv.uploaded > 0))
            this.peers.sort(peersCompare)
            this.peerMap.clear()
            this.peers.forEach(pv => this.peerMap.set(pv.address, pv))

            this.$scope.$evalAsync(() => {
                this.calculateDerived(this.peers, peerList.recentFeeders)
            })
        }

        let onPeerInfoDebounced = utils.debounce(angular.bind(this, onPeerInfo), 200, false)

        let updateTitle = () => {
            this.$scope.$evalAsync(() => {
                this.apiServerAddress = this.settings.get(SettingsService.HEAT_HOST) + ":" + this.settings.get(SettingsService.HEAT_PORT)
                this.heat.api.getBlockchainStatus().then(status => {
                    this.apiServerVersion = status.version
                })
            })
        }

        let unsubscribe
        setTimeout(() => unsubscribe = this.heat.subscriber.peer({}, onPeerInfoDebounced, this.$scope), 1000)

        setTimeout(() => {
            updateTitle()
            this.$rootScope.$on('HEAT_SERVER_LOCATION', (event, nothing) => {
                this.peerMap.clear()
                this.peers = []
                updateTitle()

                //should subscribe to new connected server
                if (unsubscribe) unsubscribe()
                unsubscribe = this.heat.subscriber.peer({}, onPeerInfoDebounced, this.$scope)
            })
        }, 1500)

        this.$scope.$on('$destroy', unsubscribe)
    }


    public feederTimeLine(pv: PeerView) {
        return pv.feederTimeLine
    }

    calculateDerived(peers: PeerView[], recentFeeders: [{ address: string; height: string }]) {
        let maxd = peers.reduce((p, v) => {
            return ( p.downloaded > v.downloaded ? p : v )
        })
        let kd = maxd.downloaded / MAX_RECT_SQUARE
        let maxu = peers.reduce((p, v) => {
            return ( p.uploaded > v.uploaded ? p : v )
        })
        let ku = maxu.uploaded / MAX_RECT_SQUARE
        let scaleRatio = Math.max(1, kd, ku)

        peers.forEach(p => {
            p.downloadedRectangle = this.calculateRectangle(p.downloaded, scaleRatio)
            p.uploadedRectangle = this.calculateRectangle(p.uploaded, scaleRatio)
            p.downloadedSpeedMeter = this.speedMeter(p.downloadedSpeedMeter, p.downloaded)
            p.uploadedSpeedMeter = this.speedMeter(p.uploadedSpeedMeter, p.uploaded)
            this.buildBlockFeederTimeLine(p, recentFeeders)
            p.connectedChangedDate = p.connectedChangedTime ? utils.timestampToDate(p.connectedChangedTime).toLocaleString() : "-"
        })
    }

    speedMeter(meter: {t: number, v: number, speed: number}, volume: number): {t: number, v: number, speed: number} {
        let now = Date.now()
        if (meter) {
            let interval = now - meter.t
            if (interval > 4000) {
                meter.speed = Math.max(0, Math.round( (volume - meter.v) / interval * 1000))
                meter.t = now
                meter.v = volume
            }
            return meter
        } else {
            return {t: now, v: volume, speed: 0}
        }
    }

    calculateRectangle(s: number, scaleRatio: number): {a: number, b: number} {
        s = s / scaleRatio
        let a = Math.sqrt(s / 8)
        let b = a * 8
        return {a: a, b: b}
    }

    buildBlockFeederTimeLine(peerView: PeerView, recentFeeders?: [{ address: string; height: string }]) {
        if (!recentFeeders) return
        peerView.feederTimeLine = recentFeeders.map(v => v.address == peerView.address ? "o" : "-").join("")
        peerView.lastFeeder = recentFeeders[recentFeeders.length - 1]?.address == peerView.address
    }

    formatBytes(value: number) {
        return utils.formatBytes(value, value > 1024 * 1024 * 1024 ? 2 : 0)
    }

}

// to limit max displayable size of rectangle
const MAX_RECT_SQUARE = 20000

interface IHeatPeerList {
    peers: IHeatPeer[]
    recentFeeders?: [{ address: string; height: string }]
}

interface PeerView extends IHeatPeer {
    updateTime: number
    downloadedRectangle: {a: number, b: number}
    uploadedRectangle: {a: number, b: number}
    downloadedSpeedMeter: {t: number, v: number, speed: number}
    uploadedSpeedMeter: {t: number, v: number, speed: number}
    lastFeeder: boolean
    feederTimeLine: string
    connectedChangedDate: string
    remoteServerRequestCounter: number
}
