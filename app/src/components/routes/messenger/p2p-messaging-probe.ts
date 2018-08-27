/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
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

@RouteConfig('/p2pmessagingprobe')
@Component({
  controller: P2PMessagingProbeComponent,
  // bindings: {
  //   "publickey": "=",
  //   "name": "="
  // },
  selector: 'probe',
  //inputs: ['publickey'],
  // styles: [`
  // `],
  template: `
<p>
  My name: <input type="text" ng-model="vm.myName" />
  Room: <input type="text" ng-model="vm.roomName" />
  Call to Peer Id: <input type="text" ng-model="vm.peerId" />
</p>

<p>
<button class="md-primary md-button md-ink-ripple" ng-click="vm.enterRoom()">Enter room</button>
<button class="md-primary md-button md-ink-ripple" ng-disabled="!vm.canCall" ng-click="vm.call()">Call</button>
</p>

<p>Who is online: {{vm.whoIsOnline}}</p>
<p><input type="text" ng-model="vm.messageText" />
<button class="md-primary md-button md-ink-ripple" ng-disabled="!vm.connected" ng-click="vm.send()">Send</button>
</p>

  <div>
    <div ng-repeat="message in vm.messages track by $index">
      <span>{{message}}</span>
    </div>
  </div>

<!--<textarea>{{vm.messageConsole}}</textarea>-->
`
  // template: `
  //   <div layout="column" flex layout-padding layout-fill class="outer-container">
  //   HELLO [{{$ctrl.publickey}}]
  //   </div>
  // `
})
@Inject('$scope', 'user', 'sendmessage', '$interval', 'P2PConnector')
class P2PMessagingProbeComponent {

  // get publickey() {
  //   return this.publickey;
  // }
  //
  // set publickey(value) {
  //   this.publickey = value;
  // }

  connected: boolean = false;
  canCall: boolean = false;
  messageText: string;
  messages: string[] = [];
  peerId: string;
  myName: string;
  roomName: string;
  room: Room;
  whoIsOnline: string;
  messageConsole: string;

  publickey: string; // @input
  loading: boolean;

  constructor(private $scope: angular.IScope,
              private user: UserService,
              private sendmessage: SendmessageService,
              private $interval: angular.IIntervalService,
              private p2pconnector: P2PConnector) {
    //user.requireLogin();

    // let interval = $interval(()=>{
    //   this.whoIsOnline = "";
    //   for (let i = 0; i < 150; i++) {
    //     this.p2pconnector.getOnlineStatus(String(i)).then(status => {
    //       if (status)
    //         this.whoIsOnline = this.whoIsOnline + i + " " + status + ";   "
    //     });
    //   }
    // }, 3*1000, 0, false);

    // $scope.$on('$destroy',()=>{
    //   $interval.cancel(interval);
    // });

    //setup p2pconnector
    this.p2pconnector.setup(
      (roomName) => {
        let room = new Room(roomName, this.p2pconnector);
        room.onMessage = msg => this.onMessage(msg);
        room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
        room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
        room.rejected = (byPeerId, reason) => {
          this.messages.push("Peer '" + byPeerId + "' rejects me. Reason: " + reason);
          this.$scope.$apply();
        };
        room.sign = this.sign;
        this.room = room;
        this.roomName = roomName;
        this.canCall = true;
        this.messages.push("Accepted incoming call in room '" + roomName + "'");
        $scope.$apply();
        return room;
      },
      caller => {
        this.messages.push("Call from '" + caller + "' accepted");
        return true; //accept all income calls
      }
    );

    //set my online status
    this.p2pconnector.setOnlineStatus("online");
  }

  enterRoom() {
    this.room = new Room(this.roomName, this.p2pconnector);
    this.room.onMessage = msg => this.onMessage(msg);
    this.room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
    this.room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
    this.room.rejected = (byPeerId, reason) => {
      this.messages.push("Peer '" + byPeerId + "' rejected me. Reason: " + reason);
      this.$scope.$apply();
    };
    this.room.sign = this.sign;
    this.room.enter();
    this.canCall = true;
  }

  call() {
    if (!this.room)
      this.enterRoom();
    this.p2pconnector.call(this.peerId, this.myName, this.room);
  }

  send() {
    this.room.sendMessage({type: "chat", text: this.messageText});
  }

  onOpenDataChannel(peerId: string) {
    this.connected = true;
    this.messages.push("Opened channel with peer '" + peerId + "'");
    this.$scope.$apply();
  }

  onCloseDataChannel(peerId: string) {
    this.connected = false;
    this.messages.push("Closed channel with peer '" + peerId + "'");
    this.$scope.$apply();
  }

  sign(dataHex: string): {signatureHex: string, dataHex: string, publicKeyHex: string} {
    //let secret = this.user.secretPhrase;
    //must be the real secret phrase to proof the passed to room public key is owned.
    //Now use the random string for testing
    let secret = randomString();
    let publicKey = heat.crypto.secretPhraseToPublicKey(secret);
    let signature = heat.crypto.signBytes(dataHex, converters.stringToHexString(secret));
    return {signatureHex: signature, dataHex: dataHex, publicKeyHex: publicKey}
  }

  onMessage(msg: any) {
    if (msg.type == "chat") {
      this.messages.push(msg.roomName + "  " + msg.fromPeerId + ": " + msg.text);
      this.$scope.$apply();
    }
  }


}
