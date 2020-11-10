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

module p2p {

  export interface MessageHistoryItem {
    msgId: string
    timestamp: number
    fromPeer: string
    content: string
    transport?: TransportType
  }

  /*
  Room message history.
   Messages are stored in the local storage.
   Messages are stored in bundles called pages:
   key -> page
   Page is encrypted array of messages.
   Key format:  num.messagesCount.timestampOfLastMessage, for example  "301.40.1552578853760"
   Pages are sorted by keys using substring 'num' in key's value.
   Count of messages in the key is used for providing scrolling ability, i.e. getting items in some range 'start-end'.
   Timestamp in the key is used for finding and deleting the oldest page on reaching limit of storage.
  */
  export class MessageHistory {

    //todo migrate from localStorage to IndexedDB

    static MAX_PAGES_COUNT = 100; //max number of pages for one room
    static MAX_PAGE_LENGTH = 100; //count of messages in one page of localStorage

    private enabled: boolean;

    private store: Store;
    private extraStore : Store; //additional data for message stored by message id, e.g. message status

    private pageStorageNum: number;  //for ordering pages from storage
    private pageContent: Array<MessageHistoryItem>;
    private pages: number[][];

    constructor(private room: Room,
                private storage: StorageService,
                private user: UserService) {

      this.enabled = true;
      this.store = storage.namespace('p2p-messages.' + this.room.name);
      //namespace for storage per message should started by different string
      // because keys (load by namespace prefix) in second namespace have other format
      // and cannot be parsed same way as in the namespace above
      this.extraStore = storage.namespace('extra-p2p-messages.' + this.room.name);

      this.init()
    }

    init() {
      //format of key of message history stored item: "pageNumber.messagesCount", e.g. "502.78"
      //Message count by pages is needing for providing requesting message items from history by range "from" "to"
      this.pages = this.store.keys()
        .map(key => {
          let ss = key.split('.');
          return [
            parseInt(ss[0]),
            (ss.length > 1 ? parseInt(ss[1]) : -1),
            (ss.length > 2 ? parseInt(ss[2]) : -1)
          ];
        })
        .sort((a, b) => a[0] - b[0]);

      //convert old format of keys to the new format
      for (var i = 0; i < this.pages.length; i++) {
        if (this.pages[i][1] == -1 || this.pages[i][2] == -1) {
          let items = this.getPageMessages(i);
          this.savePage(i, items);
        }
      }

      if (this.pages.length == 0) {
        this.pageStorageNum = 0;
        this.pages.push([0, 0]);
        this.pageContent = [];
      } else {
        this.pageStorageNum = this.pages[this.pages.length - 1][0];
        this.pageContent = this.getItems(this.pages.length - 1);
      }
      if (!this.pageContent) {
        this.pageContent = [];
      }
    }

    public getPageCount() {
      return this.pages.length;
    }

    public getItemCount(): number {
      return this.pages.map(v => v[1]).reduce((previousValue, currentValue) => previousValue + currentValue);
    }

    /**
     * Returns history items from 'start' (inclusive) to 'end' (exclusive).
     */
    public getItemsScrollable(start: number, end: number) {
      let n = 0; //messages counter by pages
      let result = [];
      if (end <= 0) {
        return result;
      }
      start = Math.max(0, start);
      let needingLength = end - start;
      for (var i = 0; i < this.pages.length; i++) {
        let page = this.pages[i];
        n = n + page[1];  //add number of messages on the page
        if (n > start) {
          let pageItems = this.getItems(i);
          let pageStartIndex = Math.max(0, result.length > 0 ? 0 : start - (n - page[1]));
          result = result.concat(pageItems.slice(pageStartIndex, pageStartIndex + (needingLength - result.length)));
        }
        if (result.length == needingLength) {
          return result;
        }
      }
      return result;
    }

    /**
     * Returns messages by page.
     * @param pageIndex in range [0, MessageHistory.getPageCount()]
     */
    public getItems(pageIndex: number): Array<MessageHistoryItem> {
      if (pageIndex >= 0 && pageIndex < this.pages.length) {
        return this.getPageMessages(pageIndex);
      }
      return [];
    }

    private getPageMessages(pageIndex: number, page?): Array<MessageHistoryItem> {
      let encryptedPage = page ? page : this.store.get(this.pageKey(pageIndex))
      if (encryptedPage) {
        try {
          //was the bug when page was stringifyed twice: json.stringfy(json.stringfy(page))
          //therefore, if necessary, have to do extra json parsing
          let pageObject = typeof encryptedPage === "string" ? JSON.parse(encryptedPage) : encryptedPage
          let pageContentStr = heat.crypto.decryptMessage(
            pageObject.data, pageObject.nonce, this.user.publicKey, this.user.secretPhrase);
          return JSON.parse(pageContentStr);
        } catch (e) {
          console.log("Error on parse/decrypt message history page");
        }
      }
      return [];
    }

    public isExistingId(msgId: string) {
      return !!this.extraStore.get(msgId)
    }

    public put(item: MessageHistoryItem) {
      this.pageContent.push(item);
      this.savePage(this.pages.length - 1, this.pageContent);
      this.putExtraInfo(item.msgId, "")  //no extra info but to register message id, later this entry may be updated

      if (this.pageContent.length >= MessageHistory.MAX_PAGE_LENGTH) {
        this.pageContent = [];
        this.pageStorageNum++;
        this.pages.push([this.pageStorageNum, 0]);
      }

      if (this.pages.length > MessageHistory.MAX_PAGES_COUNT) {
        console.log("Remove page " + this.pageKey(0));
        this.store.remove(this.pageKey(0));
        this.pages.splice(0, 1);
      }
    }

    public putExtraInfo(msgId: string, data) {
      try {
        this.extraStore.put(msgId, data);
      } catch (e) {
        console.log("Error on saving data to the local storage " + e);
        if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(e.name) >= 0) {
          //shrink history of all accounts when reach storage limit
          this.shrink(5, () => this.extraStore.put(msgId, data))
        }
      }
    }

    /**
     * Removes message in the history. Returns number of deleted messages.
     */
    //using timestamp as message id is not ideal, but it is quick solution
    public remove(timestamp: number): number {
      //todo remove message on the remote peers also
      //iterate from end to begin because more likely user removed the recent message
      for (let i = this.pages.length - 1; i >= 0; i--) {
        let items = this.getItems(i);
        //remove extra data per message
        items.filter(item => item.timestamp == timestamp).forEach(m => this.extraStore.remove(m.msgId))
        //update page with new content without removed messages
        let newItems = items.filter(item => item.timestamp != timestamp);
        if (items.length != newItems.length) {
          this.savePage(i, newItems);
          return items.length - newItems.length;
        }
      }
      return 0;
    }

    clear() {
      this.store.clear()
      this.extraStore.clear()
      this.init()
    }

    /**
     * Return true if the shrinking was success
     * @param attempts
     * @param putData
     */
    public shrink(attempts: number, putData: Function) {
      let n = attempts
      while (n > 0) {
        try {
          console.log("Trying to remove old messages history, attempt №" + (attempts + 1 - n));
          this.shrinkPageStore(attempts + 1 - n);
          putData();
          n = 0;
          return true
        } catch (e) {
          console.log("Error while shrinking message history " + e);
        }
        n--;
      }
      return false
    }

    private savePage(pageIndex: number, pageContent: Array<MessageHistoryItem>) {
      let encrypted = heat.crypto.encryptMessage(JSON.stringify(pageContent), this.user.publicKey, this.user.secretPhrase, false);
      let page = this.pages[pageIndex];
      try {
        //save page under updated key 'pageNumber.itemCount'
        this.store.remove(this.pageKey(pageIndex));
        page[1] = pageContent.length;
        page[2] = pageContent.length > 0 ? pageContent[pageContent.length - 1].timestamp : 0;
        this.store.put(this.pageKey(pageIndex), encrypted);
      } catch (domException) {
        console.log("Save page error " + domException);
        if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(domException.name) >= 0) {
          //shrink history of all accounts when reach storage limit
          this.shrink(5, () => this.store.put(this.pageKey(pageIndex), encrypted))
        }
      }
    }

    /**
     * Deletes the oldest pages among all contacts.
     */
    private shrinkPageStore(pageToRemoveNumber: number) {
      //used 'p2p-messages' instead ('p2p-messages' + this.room.name) to get keys for all rooms.
      //note 'p2p-messages' without '.'
      let allRoomStore = this.storage.namespace('p2p-messages');
      //last integer substring of page's key is timestamp of the page, example "10344812140431697156-5056413637982060108.47.100.7367346346"
      let keysByTime = allRoomStore.keys()
        .map(key => {
          let ss = key.split('.');
          return [ss[0], parseInt(ss[1]), parseInt(ss[2]), parseInt(ss[3])];
        })
        // @ts-ignore
        .sort((a, b) => a[3] - b[3]);

      //remove oldest pages
      for (let keys of keysByTime) {
        let key = keys.join('.')
        let page = allRoomStore.get(key)
        if (page) {
          //remove extra data per message
          let messages = this.getPageMessages(-1, page)
          messages.forEach(m => this.extraStore.remove(m.msgId))
          //remove the page
          allRoomStore.remove(key)
          console.log(`removed page (length ${page.length}) in the message history, page key ${key}`)
        }
        if ((--pageToRemoveNumber) <= 0) {
          break;
        }
      }
    }

    private pageKey(pageIndex: number) {
      let page = this.pages[pageIndex];
      //page[1] == -1 page[1] == -2  - it is for old format key, e.g. "4", new format is 4.122.765856765"
      return page[0] + (page[1] == -1 ? "" : "." + page[1]) + (page[2] == -1 ? "" : "." + page[2]);
    }

  }

}
