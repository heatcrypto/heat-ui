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
    roomKey: string
    type: MessageType
    timestamp: number
    receiptTimestamp?: number
    fromPeer: string
    content: string
    status: MessageStatus,
    transport?: TransportType
    selected?: boolean //  used in UI
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
  export class MessageHistory {

    private enabled: boolean;
    private pages: number[][];

    constructor(private room: Room,
                private user: UserService) {

      this.enabled = true;
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
     * Returns messages by page.
     * @param pageIndex in range [0, MessageHistory.getPageCount()]
     * @deprecated
     */
    public getItems(pageIndex: number): Array<MessageHistoryItem> {
      if (pageIndex >= 0 && pageIndex < this.pages.length) {
        return this.getPageMessages(pageIndex);
      }
      return [];
    }

    /**
     * @deprecated
     */
    private getPageMessages(pageIndex: number, page?): Array<MessageHistoryItem> {
      return [];
    }

    public isExistingId(msgId: string) {
      return db.getMessage(msgId).then(v => !!v)
    }

    public add(item: MessageHistoryItem) {
      return db.addMessage(item)
    }

    public updateMessageStatus(msgId: string, data: any) {
      return db.updateMessage(msgId, data).then(updated => {
        if (updated > 0) {
          db.getMessage(msgId).then(m => {
            if (m?.status) {
              let $rootScope = heat.$inject.get('$rootScope')
              $rootScope.$emit('OFFCHAIN_MESSAGE_EXTRA_INFO', msgId, m.status)
            }
          })
        }
      })
    }

    /**
     * Removes message in the history. Returns number of deleted messages.
     */
    public remove(msgId: string): Promise<any> {
      return db.removeMessage(msgId)
    }

    clear() {
      return db.removeMessages(this.room.key)
    }

  }

}
