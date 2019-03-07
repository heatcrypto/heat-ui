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
    timestamp: number,
    fromPeer: string,
    message: string
  }

  export class MessageHistory {

    //todo migrate from localStorage to IndexedDB

    static MAX_PAGES_COUNT = 200; //max number of pages for one room
    static MAX_PAGE_LENGTH = 100; //count of messages in one page of localStorage

    private enabled: boolean;

    private store: Store;
    // private db: IDBDatabase;

    private page: number; //current page number
    private pageContent: Array<MessageHistoryItem>;
    private pages: number[][];

    constructor(private room: Room,
                private storage: StorageService,
                private user: UserService) {

      this.enabled = true;

      // will use indexeddb later
      // if (window.indexedDB) {
      //   let dbRequest = window.indexedDB.open("P2PMessaging", 1);
      //   dbRequest.onerror = function(event) {
      //     console.log("IndexedDB request error: " + event.target.errorCode);
      //   };
      //   dbRequest.onsuccess = (event) => {
      //     this.db = dbRequest.result;
      //     this.db.onerror = (event) => {
      //       console.log("IndexedDB error: " + event.target.errorCode);
      //       this.enabled = false;
      //     };
      //   };
      //   dbRequest.onupgradeneeded = (event) => {
      //     this.db = event.target.result;
      //     let objectStore = this.db.createObjectStore("name", { keyPath: "myKey" });
      //   };
      // } else {
      //   console.log("Your browser doesn't support a stable version of IndexedDB. So message history is disabled.");
      //   this.enabled = false;
      // }

      this.store = storage.namespace('p2p-messages.' + this.room.name);
      this.pages = this.store.keys()
        .map(key => {
          let ss = key.split('.');
          return [
            parseInt(ss[0]),
            (ss.length > 1 ? parseInt(ss[1]) : -1)
          ];
        })
        .sort((a, b) => a[0] - b[0]);

      //convert old format of keys to the new format
      for (var i = 0; i < this.pages.length; i++) {
        if (this.pages[i][1] == -1) {
          let items = this.getItemsInternal('' + this.pages[i][0]);
          this.savePage(i, items);
        }
      }

      if (this.pages.length == 0) {
        this.page = 0;
        this.pages.push([0, 0]);
      } else {
        this.page = this.pages[this.pages.length - 1][0];
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

    public getItemsScroolable(start: number, end: number) {
      let n = 0;
      let result = [];
      let needingLength = end - start;
      for (var i = 0; i < this.pages.length; i++) {
        let page = this.pages[i];
        n = n + page[1];
        if (n > start) {
          let pageItems = this.getItems(i);
          let pageStartIndex = result.length > 0 ? 0 : start - (n - page[1]);
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
        return this.getItemsInternal(this.pageKey(pageIndex));
      }
      return [];
    }

    private getItemsInternal(key: string): Array<MessageHistoryItem> {
      let v = this.store.getString(key);
      if (v) {
        try {
          let encrypted = JSON.parse(v);
          let pageContentStr = heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, this.user.publicKey, this.user.secretPhrase);
          return JSON.parse(pageContentStr);
        } catch (e) {
          console.log("Error on parse/decrypt message history page");
        }
      }
      return [];
    }

    public put(item: MessageHistoryItem) {
      this.pageContent.push(item);
      this.savePage(this.page, this.pageContent);

      if (this.pageContent.length >= MessageHistory.MAX_PAGE_LENGTH) {
        this.pageContent = [];
        this.page++;
        this.pages.push([this.page, 0]);
      }

      if (this.pages.length > MessageHistory.MAX_PAGES_COUNT) {
        this.store.remove('' + this.pages[0]);
        this.pages.splice(0, 1);
      }
    }

    //using timestamp as message id is not ideal, but it is quick solution
    public remove(timestamp: number) {
      //todo remove message on the remote peers also
      //iterate from end to begin because more likely user removed the recent message
      for (let page = this.pages.length - 1; page >= 0; page--) {
        let items = this.getItems(page);
        if (items) {
          let newItems = items.filter(item => item.timestamp != timestamp);
          if (items.length != newItems.length) {
            this.savePage(page, newItems);
          }
        }
      }
    }

    private savePage(pageIndex: number, pageContent: Array<MessageHistoryItem>) {
      let encrypted = heat.crypto.encryptMessage(JSON.stringify(pageContent), this.user.publicKey, this.user.secretPhrase, false);
      let page = this.pages[pageIndex];
      try {
        //save page under updated key 'pageNumber.itemCount'
        this.store.remove(this.pageKey(pageIndex));
        this.store.put(page[0] + '.' + pageContent.length, JSON.stringify(encrypted));
        page[1] = pageContent.length;
      } catch (domException) {
        if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(domException.name) > 0) {
          //todo shrink history of all accounts when reach storage limit
        }
        this.store.put(this.pageKey(pageIndex), encrypted);
      }
    }

    private pageKey(pageIndex: number) {
      let page = this.pages[pageIndex];
      //page[1] == -1  - it is for old format key, e.g. "4", new format is 4.122"
      return page[0] + (page[1] == -1 ? "" : "." + page[1]);
    }

  }

}
