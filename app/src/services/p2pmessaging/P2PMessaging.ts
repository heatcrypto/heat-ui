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

type OnlineStatus = "online" | "offline";
type EnterRoomState = "not" | "entering" | "entered";

@Service('P2PMessaging')
@Inject('settings', 'user', 'storage', '$interval', 'heat')
class P2PMessaging implements p2p.P2PMessenger {

  public p2pContactStore: Store;
  public offchainMode: boolean = false;

  private connector: p2p.P2PConnector;

  constructor(private settings: SettingsService,
              private user: UserService,
              private storage: StorageService,
              private $interval: angular.IIntervalService,
              private heat: HeatService) {

    this.connector = new p2p.P2PConnector(this, settings, $interval);
    this.connector.setup(
      this.user.publicKey,
      (roomName, peerId: string) => this.createRoomOnIncomingCall(roomName, peerId),
      peerId => this.confirmIncomingCall(peerId),
      reason => this.onSignalingError(reason),
      dataHex => this.sign(dataHex),
      (message, peerPublicKey) => this.encrypt(message, peerPublicKey),
      (message: heat.crypto.IEncryptedMessage, peerPublicKey: string) => this.decrypt(message, peerPublicKey)
    );

    this.p2pContactStore = storage.namespace('p2pContacts');
  }

    private encrypt(message: string, peerPublicKey: string) {
      return heat.crypto.encryptMessage(message, peerPublicKey, this.user.secretPhrase, false);
    }

    private decrypt(message: heat.crypto.IEncryptedMessage, peerPublicKey: string) {
      return heat.crypto.decryptMessage(message.data, message.nonce, peerPublicKey, this.user.secretPhrase, false);
    }

  onMessage: (msg: {}, room: p2p.Room) => any;

  /**
   * Register me so can be called.
   */
  // register(): Room {
  //   let name = this.user.publicKey;
  //   let room = this.connector.rooms.get(name);
  //   if (!room) {
  //     room = new Room(this.user.publicKey, this.connector, this.storage, this.user);
  //     // room.confirmIncomingCall = peerId => this.confirmIncomingCall(peerId);
  //     // room.onMessage = msg => this.onMessage(msg);
  //     // room.onFailure = e => this.onError(e);
  //     // room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
  //     // room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
  //     // room.rejected = (byPeerId, reason) => {
  //     //   this.messages.push("Peer '" + byPeerId + "' rejected me. Reason: " + reason);
  //     //   this.$scope.$apply();
  //     // };
  //     room.enter();
  //     this.connector.rooms.set(name, room);
  //   }
  //   return room;
  // }

  set onlineStatus(status: OnlineStatus) {
    this.connector.setOnlineStatus(status);
  }

  get onlineStatus(): OnlineStatus {
    return this.connector.onlineStatus;
  }

  /**
   * Returns room with single peer.
   */
  getOneToOneRoom(peerId: string, required?: boolean): p2p.Room {
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room && required) {
      room = new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]);
      this.connector.rooms.set(roomName, room);
    }
    if (room && room.getAllPeers().size <= 1) {
      //todo check is opened channel
      return room;
    }
  }

  /**
   * Creates new room and registers it on the signaling server.
   */
  enterRoom(peerId: string): p2p.Room {
    if (this.onlineStatus == "offline") {
      return null;
    }
    let roomName = this.generateOneToOneRoomName(this.user.publicKey, peerId);
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]);
      this.connector.rooms.set(roomName, room);
    }
    if (room.state.entered == "not") {
      room.enter();
    }
    return room;
  }

  call(peerId: string): p2p.Room {
    let room = this.enterRoom(peerId);
    this.connector.call(peerId, this.user.publicKey, room);
    return room;
  }

  onSignalingError(reason: string) {
    console.log("Signaling error: " + reason);
  }

  sign(dataHex: string): p2p.ProvingData {
    //proof the passed to room public key is owned
    let signature = heat.crypto.signBytes(dataHex, converters.stringToHexString(this.user.secretPhrase));
    return {signatureHex: signature, dataHex: dataHex, publicKeyHex: this.user.publicKey}
  }

  private generateOneToOneRoomName(peerOnePublicKey: string, peerTwoPublicKey: string) {
    let arr = [heat.crypto.getAccountIdFromPublicKey(peerOnePublicKey), heat.crypto.getAccountIdFromPublicKey(peerTwoPublicKey)];
    arr.sort();
    return arr[0] + "-" + arr[1];
  }

  private createRoomOnIncomingCall(roomName: string, peerId: string) {
    let room = this.connector.rooms.get(roomName);
    if (!room) {
      room = new p2p.Room(roomName, this.connector, this.storage, this.user, [peerId]);
      // room.confirmIncomingCall = peerId => this.confirmIncomingCall(peerId);
      // room.onFailure = e => this.onError(e);
      // room.onMessage = msg => this.onMessage(msg);
      // room.onOpenDataChannel = peerId => this.onOpenDataChannel(peerId);
      // room.onCloseDataChannel = peerId => this.onCloseDataChannel(peerId);
      this.connector.rooms.set(roomName, room);
    }
    return room;
  }

  private confirmIncomingCall(peerId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      // if peer is connected already confirm silently
      if (this.isPeerConnected(peerId)) {
        resolve();
        return;
      }

      let peerAccount = heat.crypto.getAccountIdFromPublicKey(peerId);
      this.heat.api.searchPublicNames(peerAccount, 0, 100).then(accounts => {
        let expectedAccount = accounts.find(value => value.publicKey == peerId);
        if (expectedAccount) {
          let closeDialogOnConnected = (mdDialog: angular.material.IDialogService) => {
            let interval = this.$interval(() => {
              if (this.isPeerConnected(peerId)) {
                mdDialog.cancel("Already connected");
                this.$interval.cancel(interval);
              }
            }, 500, 7, false);
          };
          dialogs.confirm(
            "Incoming connect request",
            `Account &nbsp;&nbsp;<b>${expectedAccount.publicName}</b>&nbsp;&nbsp; wants to connect with you. Accepting connection will share your current IP address. Accept or decline? Click OK to accept, Cancel to decline.`,
            closeDialogOnConnected
          ).then(() => {
              this.saveContact(peerAccount, peerId, expectedAccount.publicName);
              resolve();
          });
        } else {
          reject("Account not found");
        }
      });
    });
  }

  dialog($event?, recipient?: string, recipientPublicKey?: string, userMessage?: string): p2p.CallDialog {
    return new p2p.CallDialog($event, this.heat, this.user, recipient, recipientPublicKey, this);
  }

  saveContact(account: string, publicKey: string, publicName: string) {
    let contact: IHeatMessageContact = this.p2pContactStore.get(account);
    if (!contact) {
      contact = {
        account: account,
        privateName: '',
        publicKey: publicKey,
        publicName: publicName,
        timestamp: 0
      };
      this.p2pContactStore.put(account, contact);
    }
  }

  isPeerConnected(peerId: string): boolean {
    let room = this.getOneToOneRoom(peerId);
    if (room) {
      let peer = room.getPeer(peerId);
      return peer && peer.isConnected();
    }
    return false;
  }

}
