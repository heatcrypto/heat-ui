module p2p {

  export interface MessageHistoryItem {
    timestamp: number,
    fromPeer: string,
    message: string
  }

  export class MessageHistory {

    //todo migrate from localStorage to IndexedDB

    static MAX_PAGES_COUNT = 200; //max number of pages for one room
    static MAX_PAGE_LENGTH = 100; //it is the count of messages in one item of localStorage

    private enabled: boolean;

    private store: Store;
    // private db: IDBDatabase;

    private page: number; //current page number
    private pageContent: Array<MessageHistoryItem>;
    private pages: number[];

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
      this.pages = this.store.keys().map(value => parseInt(value)).sort();
      if (this.pages.length == 0) {
        this.pages.push(this.page = 0);
      } else {
        this.page = this.pages[this.pages.length - 1];
        this.pageContent = this.getItems(this.pages.length - 1);
      }
      this.pageContent = this.pageContent ? this.pageContent : new Array<MessageHistoryItem>();
    }

    public getPageCount() {
      return this.pages.length;
    }

    /**
     * Returns messages by page.
     * @param page in range [0, MessageHistory.getPageCount()]
     */
    public getItems(page: number): Array<MessageHistoryItem> {
      if (page >= 0 && page < this.pages.length) {
        let v = this.store.getString('' + this.pages[page]);
        if (v) {
          try {
            let encrypted = JSON.parse(v);
            let pageContentStr = heat.crypto.decryptMessage(encrypted.data, encrypted.nonce, this.user.publicKey, this.user.secretPhrase);
            return JSON.parse(pageContentStr);
          } catch (e) {
            console.log("Error on parse/decrypt message history page");
          }
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
        this.pages.push(this.page);
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
            this.savePage(this.pages[page], newItems);
          }
        }
      }
    }

    private savePage(page: number, pageContent: Array<MessageHistoryItem>) {
      //todo messages encryption
      try {
        let encrypted = heat.crypto.encryptMessage(JSON.stringify(pageContent), this.user.publicKey, this.user.secretPhrase, false);
        this.store.put('' + page, JSON.stringify(encrypted));
      } catch (domException) {
        if (['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].indexOf(domException.name) > 0) {
          //todo shrink history of all accounts when reach storage limit
        }
        this.store.put('' + page, JSON.stringify(pageContent));
      }
    }

  }

}
