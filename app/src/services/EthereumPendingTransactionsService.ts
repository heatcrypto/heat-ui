/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
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

@Service('ethereumPendingTransactions')
@Inject('$q')
class EthereumPendingTransactionsService {

  public pending: { [address: string]: Array<{ txHash: string, timestamp: number, amount: string }> } = {}
  private listeners: Array<(removed?: boolean) => void> = []

  constructor(public $q: angular.IQService) {
    let oldKeys = this.loadData()

    let removeObsoleteItems = () => {
      for (const k of oldKeys) {
        this.remove(k.addr, k.txHash, k.timestamp)
      }
      if (oldKeys.length > 0) console.log(`Removed ${oldKeys.length} obsolete pending Ethereum transactions`)
    }
    removeObsoleteItems()
    setInterval(() => removeObsoleteItems(), 11 * 60 * 1000)
  }

  loadData() {
    this.pending = {}
    let oldKeys = []
    for (let i = 0; i < window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('ethPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1], txHash = parts[2], timestamp = parseInt(parts[3])
        let minutesOld = (Date.now() - timestamp) / (1000 * 60)
        if (minutesOld > 60) {
          oldKeys.push({addr, txHash, timestamp})
        } else {
          let amount = window.localStorage.getItem(key)
          this.pending[addr] = this.pending[addr] || []
          this.pending[addr].push({txHash: txHash, timestamp: timestamp, amount})
        }
      }
    }
    return oldKeys
  }

  getPendingAmount(address: string): string {
    let txs = this.pending[address]
    if (!(txs?.length > 0)) return '0'
    let totalAmount = 0
    for (const tx of txs) {
      totalAmount += parseFloat(tx.amount)
    }
    return totalAmount.toString()
  }

  add(address: string, txHash: string, timestamp: number, totalAmount) {
    window.localStorage.setItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`, totalAmount)
    this.loadData()
    this.notifyListeners(false)
  }

  remove(address: string, txHash: string, timestamp: number) {
    window.localStorage.removeItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`)
    this.loadData()
    this.notifyListeners(true)
  }

  addListener(func: (removed?: boolean) => void) {
    this.removeListener(func)
    this.listeners.push(func)
  }

  removeListener(func: (removed?: boolean) => void) {
    this.listeners = this.listeners.filter(fn => fn !== func)
  }

  notifyListeners(removed: boolean) {
    this.listeners.forEach(fn => fn(removed))
  }

}