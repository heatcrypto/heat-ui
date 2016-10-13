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
      text-align: center;
      line-height: 1.6;
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
          <md-button href="#/messenger/{{contact.accountPublicKey}}" class="md-secondary md-icon-button md-primary" ng-show="contact.hasUnreadMessage">
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
  private refresh: IEventListenerFunction;
  private activePublicKey: string;
  private store: Store;

  constructor(private $scope: angular.IScope,
              public user: UserService,
              private engine: EngineService,
              private cloud: CloudService,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService,
              private $location: angular.ILocationService,
              private $rootScope: angular.IRootScopeService,
              storage: StorageService) {

    this.refresh = utils.debounce(
      () => {
        this.getContacts()
      },
    500, true);
    this.store = storage.namespace('contacts.latestTimestamp', $scope);
    this.store.on(Store.EVENT_PUT, this.refresh);

    if (user.unlocked) {
      this.init();
    }
    else {
      user.on(UserService.EVENT_UNLOCKED, () => {
        this.init();
      });
    }

    $rootScope.$on('$locationChangeSuccess', () => {
      var path = $location.path().replace(/^\//,'').split('/'), route = path[0], params = path.slice(1);
      this.activePublicKey = (route == "messenger") ? params[0] : null;
    });
  }

  init() {
    this.getContacts();
    var topic = new TransactionTopicBuilder().account(this.user.account);
    var observer = this.engine.socket().observe<TransactionObserver>(topic).
      add(this.refresh).
      remove(this.refresh).
      confirm(this.refresh);
    this.$scope.$on("$destroy",() => { observer.destroy() });
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
    return contact.latestTimestamp > this.store.getNumber(contact.account, 0);
  }
}