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

@RouteConfig('/probe')
@Component({
  controller: ProbeComponent,
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
  Peer Id: <input type="text" ng-model="vm.peerId" />
</p>

<p>
<button class="md-primary md-button md-ink-ripple" ng-click="vm.comeInRoom()">Come in</button>
<button class="md-primary md-button md-ink-ripple" ng-disabled="!vm.canCall" ng-click="vm.call()">Call</button>
</p>

<p>Who is online: {{vm.whoIsOnline}}</p>
<p><input type="text" ng-model="vm.messageText" />
<button class="md-primary md-button md-ink-ripple" ng-disabled="!vm.connected" ng-click="vm.send()">Send</button>
</p>

  <div>
    <div ng-repeat="message in vm.messages">
      <strong>:</strong>
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
@Inject('$scope', 'user', 'sendmessage', 'P2PConnector')
class ProbeComponent {

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
              private p2pconnector: P2PConnector) {
    //user.requireLogin();

    //setup p2pconnector
    let templateRoom: Room = new Room("", this.p2pconnector);
    templateRoom.onMessage = msg => this.onMessage(msg);
    templateRoom.onOpenDataChannel = peerId => {
      this.connected = true;
    };
    this.p2pconnector.setup(
      templateRoom,
      incomingRoom => {
        this.console("Created new room: " + incomingRoom.name);
        this.room = incomingRoom;
        this.roomName = incomingRoom.name;
        this.canCall = true;
        $scope.$apply();
      },
      caller => {
        this.console("Call from: " + caller + ".   Accepted");
        return true
      }
    );

    //set my online status
    this.p2pconnector.setOnlineStatus("online");

    this.whoIsOnline = "";
    for (let i = 0; i < 50; i++) {
      this.p2pconnector.getOnlineStatus(String(i)).then(status => {
        if (status)
          this.whoIsOnline = this.whoIsOnline + i + " " + status + ";   "
      });
    }

  }

  comeInRoom() {
    this.room = new Room(this.roomName, this.p2pconnector);
    this.room.onMessage = msg => this.onMessage(msg);
    this.room.onOpenDataChannel = peerId => {
      this.connected = true;
    };
    this.p2pconnector.room(this.room);
    this.canCall = true;
  }

  call() {
    if (!this.room)
      this.comeInRoom();
    this.p2pconnector.call(this.peerId, this.myName, this.room);
  }

  send() {
    this.room.sendMessage({type: "chat", text: this.messageText});
  }

  onMessage(msg: any) {
    if (msg.type == "chat") {
      this.messages.push(msg.roomName + "  " + msg.fromPeerId + ": " + msg.text);
      this.$scope.$apply();
    }
  }

  showSendmessageDialog($event) {
    this.sendmessage.dialog($event).show();
  }

  private console(text) {
    this.messageConsole = this.messageConsole + "\n" + text;
  }

}
