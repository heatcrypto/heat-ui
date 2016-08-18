///<reference path='AbstractDataProvider.ts'/>
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

interface IMessageCount {
  unread: number;
  received: number;
  sent: number;
  total: number;
}

@Service('messageCount')
@Inject('user','cloud','$q')
class MessageCountService extends AbstractDataProvider<IMessageCount> {

  private unsubscribe: () => void;

  constructor(private user: UserService,
              private cloud: CloudService,
              private $q: angular.IQService) {
    super();

    user.addListener(UserService.EVENT_UNLOCKED, () => this.userUnlocked());
    user.addListener(UserService.EVENT_LOCKED, () => this.userLocked());

    if (user.unlocked) {
      this.userUnlocked();
    }
  }

  userLocked() {
    if (angular.isFunction(this.unsubscribe)) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  userUnlocked() {
    this.unsubscribe = this.cloud.events.onMessage(() => {
      this.refresh();
    })
    this.refresh();
  }

  getInitialData(): IMessageCount {
    return {
      unread: 0,
      received: 0,
      sent: 0,
      total: 0
    }
  }

  getData(): angular.IPromise<IMessageCount> {
    return this.cloud.api.getMessageCount(this.user.accountRS,"");
  }
}