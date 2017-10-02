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
interface IHeatSubscriberBlockPushedFilter {
  generator?: string;
}

interface IHeatSubscriberBlockPoppedFilter {
  generator?: string;
}

interface IHeatSubscriberBalanceChangedFilter {
  account?: string;
  currency?: string;
}

interface IHeatSubscriberBalanceChangedResponse {
  account: string;
  currency: string;
  quantity: string;
}

interface IHeatSubscriberOrderFilter {
  account?: string;
  currency?: string;
  asset?: string;
  unconfirmed?: string; // true or false
  type?: string; // ask or bid
}

interface IHeatSubscriberTradeFilter {
  seller?: string;
  buyer?: string;
  currency?: string;
  asset?: string;
}

interface IHeatSubscriberMessageFilter {
  sender?: string;
  recipient?: string;
}

interface IHeatSubscriberUnconfirmedTransactionFilter {
  sender?: string;
  recipient?: string;
}

class HeatSubscriber {

  private RETRY_SYNC_DELAY = 2.5 * 1000; // 2.5 seconds in milliseconds

  // websocket subscription topics - these match the topics in the java com.heatledger.websocket package
  private BLOCK_PUSHED = "1";
  private BLOCK_POPPED = "2";
  private BALANCE_CHANGED = "3";
  private ORDER = "4";
  private TRADE = "5";
  private MESSAGE = "6";
  private UNCONFIRMED_TRANSACTION = "7";
  private MICROSERVICE = "8";

  private connectedSocketPromise: angular.IPromise<WebSocket> = null;
  private subscribeTopics: Array<HeatSubscriberTopic> = [];
  private unsubscribeTopics: Array<HeatSubscriberTopic> = [];

  constructor(private url: string,
              private $q: angular.IQService,
              private $timeout: angular.ITimeoutService) {
  }

  /* Put all subscriber options here */

  public blockPushed(filter: IHeatSubscriberBlockPushedFilter, callback: (IHeatBlock)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.BLOCK_PUSHED, filter), callback, $scope);
  }

  public blockPopped(filter: IHeatSubscriberBlockPoppedFilter, callback: (IHeatBlock)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.BLOCK_POPPED, filter), callback, $scope);
  }

  public balanceChanged(filter: IHeatSubscriberBalanceChangedFilter, callback: (IHeatSubscriberBalanceChangedResponse)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.BALANCE_CHANGED, filter), callback, $scope);
  }

  public order(filter: IHeatSubscriberOrderFilter, callback: (IHeatOrder)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.ORDER, filter), callback, $scope);
  }

  public trade(filter: IHeatSubscriberTradeFilter, callback: (IHeatTrade)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.TRADE, filter), callback, $scope);
  }

  public message(filter: IHeatSubscriberMessageFilter, callback: (IHeatMessage)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.MESSAGE, filter), callback, $scope);
  }

  public unconfirmedTransaction(filter: IHeatSubscriberUnconfirmedTransactionFilter, callback: (IHeatTransaction)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.UNCONFIRMED_TRANSACTION, filter), callback, $scope);
  }

  public microservice(filter: IStringHashMap<string>, callback: (any)=>void, $scope?: angular.IScope): () => void {
    return this.subscribe(new HeatSubscriberTopic(this.MICROSERVICE, filter), callback, $scope);
  }

  /* End subscriber options, start of general implementation code */

  private subscribe(newTopic: HeatSubscriberTopic, callback: (any)=>void, $scope?: angular.IScope): () => void {
    var topic = this.findExistingOrAddNewTopic(newTopic);
    topic.addListener(callback);
    var unsubscribe = this.createUnsubscribeFunction(topic, callback);
    if (angular.isDefined($scope)) {
      $scope.$on('$destroy', ()=>{ unsubscribe() });
    }
    this.syncTopicSubscriptions();
    return unsubscribe;
  }

  private findExistingOrAddNewTopic(topic: HeatSubscriberTopic): HeatSubscriberTopic {
    for (var i=0; i<this.subscribeTopics.length; i++) {
      if (this.subscribeTopics[i].equals(topic)) {
        return this.subscribeTopics[i];
      }
    }
    this.subscribeTopics.push(topic);
    return topic;
  }

  private createUnsubscribeFunction(topic: HeatSubscriberTopic, callback: (any)=>void): () => void {
    return ()=>{
      topic.removeListener(callback);
      if (topic.isEmpty()) {
        this.unsubscribeTopic(topic);
      }
    };
  }

  private unsubscribeTopic(topic: HeatSubscriberTopic) {
    this.subscribeTopics = this.subscribeTopics.filter(t => t !== topic);
    this.unsubscribeTopics.push(topic);
    this.syncTopicSubscriptions();
  }

  private syncTopicSubscriptions() {
    this.getConnectedSocket().then(
      (websocket)=>{
        this.unsubscribeTopics.forEach(topic => {
          if (topic.isSubscribed()) {
            this.sendUnsubscribe(websocket, topic);
          }
        });
        this.unsubscribeTopics = this.unsubscribeTopics.filter(topic => !topic.isSubscribed());
        this.subscribeTopics.forEach(topic => {
          if (!topic.isSubscribed()) {
            this.sendSubscribe(websocket, topic);
          }
        });
        // if there is a topic which is not subscribed we need to sync again
        if (this.subscribeTopics.find(topic => !topic.isSubscribed())) {
          this.$timeout(this.RETRY_SYNC_DELAY).then(() => {
            this.syncTopicSubscriptions();
          });
        }
      },
      ()=>{
        // on failure call syncTopicSubscriptions again after 5 seconds.
        this.$timeout(this.RETRY_SYNC_DELAY).then(() => {
          this.syncTopicSubscriptions();
        });
      }
    )
  }

  private getConnectedSocket(): angular.IPromise<WebSocket> {
    if (this.connectedSocketPromise) {
      return this.connectedSocketPromise;
    }
    let deferred  = this.$q.defer<WebSocket>();
    var websocket = new WebSocket(this.url);
    this.hookupWebsocketEventListeners(websocket, deferred);
    return this.connectedSocketPromise = deferred.promise;
  }

  private hookupWebsocketEventListeners(websocket: WebSocket, deferred: angular.IDeferred<{}>) {
    var onclose = (event) => {
      deferred.reject();
      this.connectedSocketPromise = null;
      websocket.onclose = null;
      websocket.onopen = null;
      websocket.onerror = null;
      websocket.onmessage = null;
      this.subscribeTopics.forEach(topic => { topic.setSubscribed(false) })
      this.syncTopicSubscriptions();
    };
    var onerror = onclose;
    var onopen = (event) => {
      deferred.resolve(websocket);
    };
    var onmessage = (event) => {
      try {
        this.onMessageReceived(JSON.parse(event.data));
      } catch (e) {
        console.log("Websocket parse error", e);
      }
    };
    websocket.onclose = onclose;
    websocket.onopen = onopen;
    websocket.onerror = onerror;
    websocket.onmessage = onmessage;
  }

  private sendUnsubscribe(websocket: WebSocket, topic: HeatSubscriberTopic) {
    if (websocket.readyState == 1) {
      websocket.send(JSON.stringify(["unsubscribe",[[topic.topicId,topic.params]]]));
      topic.setSubscribed(false);
    }
  }

  private sendSubscribe(websocket: WebSocket, topic: HeatSubscriberTopic) {
    if (websocket.readyState == 1) {
      websocket.send(JSON.stringify(["subscribe",[[topic.topicId,topic.params]]]));
      topic.setSubscribed(true);
    }
  }

  private onMessageReceived(messageJson: Object) {
    if (!angular.isArray(messageJson) || messageJson.length != 3) {
      console.log("Websocket invalid message", messageJson);
      return;
    }
    var topicAsStr = messageJson[0], details = messageJson[1], contents = messageJson[2];
    if (!angular.isString(topicAsStr)||!angular.isObject(details)) {
      console.log("Websocket invalid field", messageJson);
      return;
    }

    this.subscribeTopics.forEach(topic => {
      if (topic.topicId == topicAsStr && this.topicMatchesDetails(topic, details)) {
        this.invokeListeners(topic, contents);
      }
    });
  }

  private topicMatchesDetails(topic: HeatSubscriberTopic, details: Object) {
    var filterKeys = Object.getOwnPropertyNames(topic.params);
    for (var i=0, key = filterKeys[i]; i<filterKeys.length; i++) {
      if (topic.params[key] != details[key]) return false;
    }
    return true;
  }

  private invokeListeners(topic: HeatSubscriberTopic, contents: Object) {
    topic.listeners.forEach(listener=>{
      try {
        listener(contents);
      } catch (e) {
        console.error(e);
      }
    });
  }
}