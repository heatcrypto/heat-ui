/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
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
  selector: 'userContacts',
  styles: [`
    user-contacts .small-icon {
      font-size: 24px;
    }
    user-contacts md-menu-item.active {
      font-weight: bold;
      color: green;
    }
    user-contacts .has-unread-message {
      font-size: 100%;
      color: #E91E63;
    }
  `],
  template: `
    <div layout="column" flex>
      <md-content layout="column">
        <md-menu-item ng-repeat="contact in vm.contacts"
          ng-class="{'active': (contact.accountPublicKey == vm.activePublicKey) }">
          <md-button href="#/messenger/{{contact.accountPublicKey}}">
            <md-icon md-font-library="material-icons" class="md-avatar">contact_mail</md-icon>
            {{contact.account}}
          </md-button>
          <md-button href="#/messenger/{{contact.accountPublicKey}}" class="md-secondary md-icon-button" ng-show="contact.hasUnreadMessage">
            <md-icon md-font-library="material-icons" class="has-unread-message">fiber_manual_record</md-icon>
          </md-button>
        </md-menu-item>
      </md-content>
    </div>
  `
})
@Inject('$scope','user','engine','cloud','$q','$timeout','$location','$rootScope','storage')
class UserContactsComponent {

  public contacts : Array<ICloudMessageContact> = [];
  private refresh: Function;
  private activePublicKey: string;
  private lastestTimestampStore: Store;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private engine: EngineService,
              private cloud: CloudService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private $location: angular.ILocationService,
              private $rootScope: angular.IRootScopeService,
              storage: StorageService) {
    this.lastestTimestampStore = storage.namespace('contacts.latestTimestamp');

    if (user.unlocked)
      this.getContacts();
    else
      user.on(UserService.EVENT_UNLOCKED, () => { this.getContacts() });

    this.refresh = () => { this.getContacts() };

    var topic = new TransactionTopicBuilder().account(this.user.account);
    var observer = engine.socket().observe<TransactionObserver>(topic).
      add(this.refresh).
      remove(this.refresh).
      confirm(this.refresh);

    $scope.$on("$destroy",() => { observer.destroy() });

    $rootScope.$on('$locationChangeSuccess', () => {
      console.log("LocationChange", $location.path());
      var path = $location.path().replace(/^\//,'').split('/'), route = path[0], params = path.slice(1);
      this.activePublicKey = (route == "messenger") ? params[0] : null;
    });
  }

  getCloudGetMessageContactsRequest() : ICloudGetMessageContactsRequest {
    return {
      accountRS: this.user.accountRS,
      firstIndex: 0,
      lastIndex: 100
    }
  }

  getContacts() {
    this.cloud.api.getMessageContacts(this.getCloudGetMessageContactsRequest()).then((contacts) => {
      this.$scope.$evalAsync(() => {
        this.contacts = contacts.map((contact) => {
          contact['hasUnreadMessage'] = this.contactHasUnreadMessage(contact);
          return contact;
        })
      });
    })
  }

  contactHasUnreadMessage(contact: ICloudMessageContact): boolean {
    return contact.latestTimestamp > this.lastestTimestampStore.getNumber(contact.account, 0);
  }
}