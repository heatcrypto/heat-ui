namespace importExport {

  export function importWallet(files, $scope, $mdToast, localKeyStore: LocalKeyStoreService, walletFile) {

    processFile(files)

    let doAfterImport = () => {
      setTimeout(() => window.location.reload(), 6000)
      $mdToast.show($mdToast.simple().textContent('Data is imported. The app will now restart...').hideDelay(7000))
    }

    function processFile(files) {
      if (files && files[0]) {
        let file = files[0]
        let reader = new FileReader()
        reader.onload = (e) => {
          $scope.$evalAsync(() => {
            let fileContents = reader.result
            let data = walletFile.parseJSON(<string>fileContents)
            let p = Promise.resolve(null)
            if (!data) return
            if (data["heatwallet-raw-data"]) {
              p = p.then(s => walletFile.importRawData(data) + ".  The app will now restart...").then(() => {
                for (let key in localStorage) {
                  if (key.startsWith('heatwallet-db-converted')) {
                    localStorage.removeItem(key)
                  }
                }
                importExport.copyOldP2PMessagesToIndexedDB()
              })
              setTimeout(() => window.location.reload(), 4000)
            } else if (data['entries'] && data['version']) {
              let wallet = walletFile.createFromText(data)
              if (wallet) {
                p = p.then(s => {
                  return localKeyStore.import(wallet).then(addedKeys => {
                    let isBig = addedKeys.length > 8
                    let report = (isBig ? addedKeys.filter((value, index) => index < 7) : addedKeys)
                    .map(v => v.account + (v.name ? "[" + v.name + "]" : ""))
                    .join(", ")
                    if (isBig) report = report + "\n..."
                    $mdToast.show($mdToast.simple().textContent(
                        `Imported ${addedKeys.length} keys into this device: \n ${report}`
                    ).hideDelay(7000))
                    doAfterImport()
                  }).catch(reason => {
                    console.error(reason)
                    return `Error on processing file content: ${reason}`
                  })
                })
              }
            } else if (data['formatName'] == 'dexie') {
              importDatabaseFile(file, fileContents)
            } else {
              return 'Invalid wallet file'
            }
            p.then(s => {
              if (s) $mdToast.show($mdToast.simple().textContent(s).hideDelay(7000))
            })
          })
        }
        reader.readAsText(file)
      }
    }

    function importDatabaseFile(file, fileContent) {
      const blob = new Blob([fileContent], {type: file.type})
      let displayError = (reason) => {
        let s = `Error ${reason}`
        $mdToast.show($mdToast.simple().textContent(s).hideDelay(12000))
      }

      // before adding new records remove records that very likely lead to constraint error.
      // It allows to add imported data to existing wallet entries if there are no equal entries.
      db.removeValue('fileVersion').then(() => {
        db.importDatabase(blob)
        .then(doAfterImport)
        .catch(reason => {
          if (reason?.failures?.length > 0 && reason?.failures[0].name.indexOf('ConstraintError') > -1) {
            dialogs.confirm('Import wallet database',
                'Detected not empty database in this app. It will be cleared and filled from the file').then(() => {
              db.deleteDatabase().then(() => db.importDatabase(blob)).then(() => {
                doAfterImport()
              }).catch(reason => displayError(reason))
            })
          } else {
            displayError(reason)
          }
        })
      })

    }

  }

  export const OLD_P2PMESSAGES_PREFIX = 'OLD_P2PMESSAGE.' // for fast querying using dexie keyword 'startWith'

  /**
   * On user unlock the old p2p messages are converted to the actual data in the IndexedDB.
   * So we have to keep old p2p messages (of many users) until user accounts will be unlocked.
   * Better to save old p2p messages in the IndexedDB to provide it possible next exports for new devices.
   * In fact on conversion the old data are putted to localStorage again. The reason: copying provides p2p messages data
   * in the IndexedDB, so then export data from IndexedDB provides the old p2p messages data on new place.
   */
  export function copyOldP2PMessagesToIndexedDB() {
    let n = 0
    for (let i = 0; i < localStorage.length; i++) {
      let k = localStorage.key(i)
      // records containing '.p2p-messages.' or '.extra-p2p-messages.'
      if (k.indexOf('p2p-messages.') > 0) {
        db.putValue(OLD_P2PMESSAGES_PREFIX + k, localStorage.getItem(k))
        n++
      }
    }
    return n
  }

  export function convertOldP2PMessagesToIndexedDB(account: string, publicKey: string) {
    db.getValuesStartWith(OLD_P2PMESSAGES_PREFIX + account).then((records: any[]) => {
      let keysToRemove = []
      let storageNamespaces = new Set<string>()
      for (const r of records) {
        keysToRemove.push(r.key)
        if (r.key.indexOf('.p2p-messages.') == -1) continue  //skip records like 'extra-p2p-messages'
        let ss: string[] = r.key.split('.')
        /*for example:
        original key was "9732640599563561883.p2p-messages.5056413637982060108-9732640599563561883.0.1.1650452154592"
        after copyP2PMessagesToIndexedDB() the key is "OLD_P2PMESSAGE.9732640599563561883.p2p-messages.5056413637982060108-9732640599563561883.0.1.1650452154592"
        build namespace for storage: "9732640599563561883.p2p-messages.5056413637982060108-9732640599563561883"
        */
        storageNamespaces.add(ss[1] + '.' + ss[2] + '.' + ss[3])
        let key2 = r.key.replace(OLD_P2PMESSAGES_PREFIX, '')
        localStorage.setItem(key2, r.value) // OldMessageHistory works with LocalStorage so the record should be there
      }
      let heatService = <HeatService>heat.$inject.get('heat')
      let storageService = <StorageService>heat.$inject.get('storage')
      let userService = <UserService>heat.$inject.get('user')
      let p2pMessaging = <P2PMessaging>heat.$inject.get('P2PMessaging')

      return db.listContacts(account).then((contacts: any[]) => {
        let promises1: PromiseLike<any>[] = []
        storageNamespaces.forEach(namespace => {
          let messageHistory = new p2p.MessageHistory(userService)
          let oldMessageHistory = new OldMessageHistory(namespace, storageService, userService)
          let oldItems = oldMessageHistory.getItemsAll()
          //if (items.length > 0) {
          console.log(namespace, oldItems.length)
          //}

          // find contact account in the namespace substring (after last dot) like "5056413637982060108-9732640599563561883"
          let twoAccounts = namespace.substring(namespace.lastIndexOf('.') + 1).split('-')
          let contactAccount = twoAccounts[0] == account ? twoAccounts[1] : twoAccounts[0]
          let contact = contacts.find(c => contactAccount == heat.crypto.getAccountIdFromPublicKey(c.publicKey))
          let contactPublicKeyPromise = contact?.publicKey
              ? Promise.resolve(contact.publicKey)
              : heatService.api.getPublicKey(contactAccount)
          promises1.push(
              contactPublicKeyPromise.then(contactPublicKey => {
                let roomKey = p2pMessaging.generateOneToOneRoomKey(contactPublicKey)
                let promises2: PromiseLike<any>[] = []
                let successNum = 0, errorNum = 0
                for (const oldItem of oldItems) {
                  let oldStatus = oldItem.extraInfo?.status
                  let status: p2p.MessageStatus = {
                    stage: oldStatus?.stage || oldItem['stage'] || 0,
                    remark: oldStatus?.remark || '',
                    fileIndicator: oldStatus?.fileIndicator || oldItem['fileIndicator'] || 0
                  }
                  let item: p2p.MessageHistoryItem = {
                    msgId: oldItem.msgId,
                    content: oldItem.content,
                    fromPeer: oldItem.fromPeer,
                    toPeer: account == heat.crypto.getAccountIdFromPublicKey(oldItem.fromPeer) ? contactPublicKey : publicKey,
                    receiptTimestamp: oldItem.receiptTimestamp,
                    roomKey: roomKey,
                    status: status,
                    timestamp: oldItem.timestamp,
                    transport: oldItem.transport,
                    type: oldItem.type
                  }
                  promises2.push(messageHistory.add(item).then(id => {
                    if (id) successNum++
                    else errorNum++
                  }))
                }
                return Promise.all(promises2).then(() => console.log(`added ${successNum}, rejected ${errorNum}`))
              })
          )
        })
        return Promise.all(promises1)
      }).then(() => keysToRemove)
    }).then((keysToRemove: string[]) => {
      //remove records from IndexedDB to prevent duplicate imports in the future
      let p = Promise.resolve()
      for (const key of keysToRemove) {
        p = p.then(() => db.removeValue(key))
      }
      return p.then(() => console.log(`account ${account}, cleared ${keysToRemove.length} records`))
    }).catch(error => console.error(error))
  }

  type TransportType = "chain" | "p2p" | "server"
  type MessageType = "chat" | "contactUpdate" | "newContact" | "file" | ""

  interface OldMessageExtraInfo {
    status: {
      stage: number // 0 - nothing (outgoing), 1 - delivered, 2 - read, 3 - rejected by server
      remark?: string
      fileIndicator?: number // 0 - it is not "incoming file" message; 1 - file is not downloaded; 2 - file is downloaded;
      // 3 - file is downloading (in progress); 4 - error on download
    }
  }

  interface OldMessageHistoryItem {
    msgId: string
    type: MessageType
    timestamp: number
    receiptTimestamp?: number
    fromPeer: string
    content: string
    transport?: TransportType
    extraInfo?: OldMessageExtraInfo
  }

  const DEFAULT_STORAGE_SPACE_LIMIT = 5 * 1024 * 1024
  const DO_CHECK_SPACE_THRESHOLD = 0.79 //skip some invokes of free space check until the 0.7 of the storage limit
  const CLEAR_SPACE_THRESHOLD = 0.8  //when local storage is filled 0.8 of the limit the old messages will be removed

  /**
   * Skip check if occupied space is far from limit.
   */
  const checkStorageSpaceEconomizer = {
    lastOccupiedShare: 0,
    skipCounter: 0,
    reset(occupiedShare: number) {
      if (occupiedShare < DO_CHECK_SPACE_THRESHOLD) {
        this.skipCounter = Math.min(33, 4 + DO_CHECK_SPACE_THRESHOLD / occupiedShare).toFixed(0)
        this.lastOccupiedShare = occupiedShare
      }
    },
    isToSkip() {
      if (this.skipCounter > 0) {
        this.skipCounter--
        return true
      }
      return false
    }
  }

  /*
  Room message history.
   Messages are stored in the local storage.
   There is no way to get individual message by id because messages are stored in bundles called pages:
   key -> page
   Page is encrypted array of messages.
   Key format:  num.messagesCount.timestampOfLastMessage, for example  "301.40.1552578853760"
   Pages are sorted by keys using substring 'num' in key's value.
   Count of messages in the key is used for providing scrolling ability, i.e. getting items in some range 'start-end'.
   Timestamp in the key is used for finding and deleting the oldest page on reaching limit of storage.
  */
  export class OldMessageHistory {

    static MAX_PAGES_COUNT = 100; //max number of pages for one room
    static MAX_PAGE_LENGTH = 100; //count of messages in one page of localStorage

    private enabled: boolean;

    private store: Store;
    private extraStore: Store; //additional data for message stored by message id, e.g. message status

    private pageStorageNum: number;  //for ordering pages from storage
    private pageContent: Array<OldMessageHistoryItem>;
    private pages: number[][];

    constructor(/*private room: Room,*/ namespace: string, // e.g. 9732640599563561883.p2p-messages.5056413637982060108-9732640599563561883
                private storage: StorageService,
                private user: UserService) {

      this.enabled = true;
      this.store = storage.namespace(namespace, null, true)
      //namespace for storage per message should started by different string
      // because keys (load by namespace prefix) in second namespace have other format
      // and cannot be parsed same way as in the namespace above
      this.extraStore = storage.namespace(namespace.replace('p2p-messages', 'extra-p2p-messages'))

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

    public getPageIndexes() {
      return Array.from(Array(this.pages.length).keys())
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
    public getItems(pageIndex: number): Array<OldMessageHistoryItem> {
      if (pageIndex >= 0 && pageIndex < this.pages.length) {
        return this.getPageMessages(pageIndex);
      }
      return [];
    }

    /**
     * Be careful, may be out of memory
     */
    public getItemsAll() {
      let result: OldMessageHistoryItem[] = []
      for (let i = 0; i < this.pages.length; i++) {
        let items = this.getPageMessages(i)
        if (items?.length > 0) {
          result = result.concat(items)
        }
      }
      return result
    }

    private getPageMessages(pageIndex: number, page?): Array<OldMessageHistoryItem> {
      let encryptedPage = page ? page : this.store.get(this.pageKey(pageIndex))
      if (encryptedPage) {
        try {
          //was the bug when page was stringifyed twice: json.stringfy(json.stringfy(page))
          //therefore, if necessary, have to do extra json parsing
          let pageObject = typeof encryptedPage === "string" ? JSON.parse(encryptedPage) : encryptedPage
          let encrypted = pageObject.encrypted ? pageObject.encrypted : pageObject
          let pageContentStr = heat.crypto.decryptMessage(
              encrypted.data, encrypted.nonce, this.user.publicKey, this.user.secretPhrase);
          let items: Array<OldMessageHistoryItem> = JSON.parse(pageContentStr);
          items.forEach(v => v.extraInfo = this.getExtraInfo(v.msgId))
          return items
        } catch (e) {
          console.log("Error on parse/decrypt message history page");
        }
      }
      return [];
    }

    public getExtraInfo(msgId: string): OldMessageExtraInfo {
      return this.extraStore.get(msgId)
    }

    clear() {
      this.store.clear()
      this.extraStore.clear()
      this.init()
    }


    private savePage(pageIndex: number, pageContent: Array<OldMessageHistoryItem>) {
      let occupiedSpaceBefore = this.checkStorageSpace(true, false)
      let occupiedSpaceAfter = occupiedSpaceBefore ? this.checkStorageSpace(false, true) : null
      if (occupiedSpaceAfter && occupiedSpaceAfter != occupiedSpaceBefore) {
        console.log(`Removed data length ${occupiedSpaceBefore - occupiedSpaceAfter}, storage occupied space ${occupiedSpaceAfter}`)
      }

      let encrypted = heat.crypto.encryptMessage(JSON.stringify(pageContent), this.user.publicKey, this.user.secretPhrase, false);
      let page = this.pages[pageIndex];
      try {
        //save page under updated key 'pageNumber.itemCount'
        this.store.remove(this.pageKey(pageIndex));
        page[1] = pageContent.length;
        page[2] = pageContent.length > 0 ? pageContent[pageContent.length - 1].timestamp : 0;
        this.store.put(this.pageKey(pageIndex), {encrypted: encrypted, ids: pageContent.map(v => v.msgId)});
      } catch (domException) {
        console.error("Save page error " + domException);
      }
    }

    /**
     * Deletes the oldest pages among all contacts.
     */
    //todo allRoom=true does not work properly because removing entries from this.extraStore is impossible
    // due impossible to decrypt pages in rooms created under another user.
    // So remove the pages of current unlocked account only
    private shrinkPageStore(pageToRemoveNumber: number, allRooms: boolean = true) {
      //used 'p2p-messages' instead ('p2p-messages' + this.room.name) to get keys for all rooms.
      //note 'p2p-messages' without '.'
      let roomStore = allRooms ? this.storage.namespace('p2p-messages') : this.store
      //last integer substring of page's key is timestamp of the page, example "10344812140431697156-5056413637982060108.47.100.7367346346"
      let keysByTime = roomStore.keys()
      .map(key => {
        let ss = key.split('.')
        return {original: key, timestamp: parseInt(ss[ss.length - 1])}
      })
      // @ts-ignore
      .sort((a, b) => a.timestamp - b.timestamp);

      //remove oldest pages
      for (let k of keysByTime) {
        let key = k.original
        let page = roomStore.get(key)
        if (page) {
          //remove extra data per message
          if (page.ids) {
            page.ids.forEach(id => this.extraStore.remove(id))
          }
          //remove the page
          roomStore.remove(key)
          console.log(`removed page ${key} length ${page.ids ? page.ids.length : "?"} in the message history`)
        }
        if ((--pageToRemoveNumber) <= 0) break
      }
    }

    private pageKey(pageIndex: number) {
      let page = this.pages[pageIndex];
      //page[1] == -1 page[1] == -2  - it is for old format key, e.g. "4", new format is 4.122.765856765"
      return page[0] + (page[1] == -1 ? "" : "." + page[1]) + (page[2] == -1 ? "" : "." + page[2]);
    }

    private checkStorageSpace(shrink: boolean = true, resetChecking: boolean = false) {
      //skip check if occupied space is far from limit
      if (checkStorageSpaceEconomizer.isToSkip()) return null

      let totalAmount = 0
      let n = 0
      for (let x in localStorage) {
        // Value is multiplied by 2 due to data being stored in `utf-16` format, which requires twice the space.
        let amount = localStorage[x].length * 2
        if (!isNaN(amount) && localStorage.hasOwnProperty(x)) {
          // console.log(x, localStorage.getItem(x), amount);
          totalAmount += amount
          n++
        }
      }
      let occupiedShare = totalAmount / DEFAULT_STORAGE_SPACE_LIMIT
      if (resetChecking) checkStorageSpaceEconomizer.reset(occupiedShare)
      if (shrink && occupiedShare > CLEAR_SPACE_THRESHOLD) {
        console.warn(`Estimated occupied storage space ${(totalAmount / 1024 / 1024).toFixed(2)}  Entries count ${n}`)
      }
      return totalAmount
    }

  }

}
