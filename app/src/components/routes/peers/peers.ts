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
    .peer {
        display: inline-block;
        background-color: lightslategrey;
        border-radius: 9px;
        padding: 6px;
        margin: 4px;
    }
    .downloaded {
        border: solid 1px lightgrey;
        border-radius: 6px;
        padding: 4px;
        margin: 4px;
        background-color: #b0ffb07a;
        min-width: 120px;    
        min-height: 18px;
    }
    .uploaded {
        border: solid 1px lightgrey;
        border-radius: 6px;
        padding: 4px;
        margin: 4px;
        background-color: #7175f552;
        min-width: 120px;    
        min-height: 18px;
    }
  `],
    template: `
    <div layout="column" flex layout-fill style="padding: 8px">
        <h2>Network peers</h2>
        <div style="overflow: scroll">
            <p>Connected to <span style="font-weight: bold;">{{vm.apiServerAddress}}</span>, server version <span style="font-weight: bold;">{{vm.apiServerVersion}}</span></p>
            <div ng-repeat="item in vm.peers" class="peer">
                {{item.address}}  {{item.platform}}  {{item.application}}  {{item.version}}  <b>{{item.state}}</b>
                <div class="downloaded" style="width: {{item.downloadedRectangle.b}}px;height: {{item.downloadedRectangle.a}}px;">downloaded {{item.downloaded}}</div>
                <div class="uploaded" style="width: {{item.uploadedRectangle.b}}px;height: {{item.uploadedRectangle.a}}px;">uploaded {{item.uploaded}}</div>
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

        let updateTitle = () => {
            this.$scope.$evalAsync(() => {
                this.apiServerAddress = settings.get(SettingsService.HEAT_HOST) + ":" + settings.get(SettingsService.HEAT_PORT)
                this.heat.api.getBlockchainStatus().then(status => {
                    this.apiServerVersion = status.version
                })
            })
        }

        $rootScope.$on('HEAT_SERVER_LOCATION', (event, nothing) => {
            this.peers = []
            updateTitle()
        })

        updateTitle()

        this.peerMap = new Map<string, PeerView>()

        let onPeerInfo = (peerList: IHeatPeerList) => {
            // @ts-ignore
            peerList.peers.forEach(p => this.peerMap.set(p.address, p))
            this.$scope.$evalAsync(() => {
                this.peers = Array.from(this.peerMap, ([name, value]) => value)
                this.calculateDerived(this.peers)
            })
        }
        let onPeerInfoDebounced = utils.debounce(angular.bind(this, onPeerInfo), 500, false)

        this.heat.subscriber.peer({}, onPeerInfoDebounced, this.$scope)
    }

    public calculateDerived(peers: PeerView[]) {
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
            p.downloadedRectangle = this.goldRectangle(p.downloaded, scaleRatio)
            p.uploadedRectangle = this.goldRectangle(p.uploaded, scaleRatio)
        })
    }

    goldRectangle(s: number, scaleRatio: number): {a: number, b: number} {
        s = s / scaleRatio
        let a = Math.sqrt(s / 1.618)
        let b = a * 1.618
        return {a: a, b: b}
    }

}

// to limit max displayable size of rectangle
const MAX_RECT_SQUARE = 90000

interface IHeatPeerList {
    peers: IHeatPeer[]
}

interface PeerView extends IHeatPeer {
    downloadedRectangle: {a: number, b: number}
    uploadedRectangle: {a: number, b: number}
}
