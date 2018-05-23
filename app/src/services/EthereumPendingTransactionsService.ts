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
@Inject('$q', 'http', 'settings','web3','ethplorer')
class EthereumPendingTransactionsService {

  public pending: {[address:string]:Array<{txHash:string,timestamp:number}>} = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settings: SettingsService,
              private web3: Web3Service,
              private ethplorer: EthplorerService) {
    this.readLocalStorage()
  }

  readLocalStorage() {
    this.pending = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('ethPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txHash = parts[2], timestamp = parseInt(parts[3])
        this.pending[addr] = this.pending[addr] || []
        this.pending[addr].push({txHash:txHash, timestamp: timestamp});
      }
    }
  }

  add(address:string, txHash:string, timestamp: number) {
    window.localStorage.setItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`, "1")
    this.readLocalStorage()
    this.notifyListeners(false)
  }

  remove(address:string, txHash:string, timestamp: number) {
    window.localStorage.removeItem(`ethPendingTxn:${address}:${txHash}:${timestamp}`)
    this.readLocalStorage()
    this.notifyListeners(true)
  }

  addListener(func: (removed?: boolean)=>void) {
    this.removeListener(func)
    this.listeners.push(func)
  }

  removeListener(func: (removed?: boolean)=>void) {
    this.listeners = this.listeners.filter(fn => fn !== func)
  }

  notifyListeners(removed: boolean) {
    this.listeners.forEach(fn => fn(removed))
  }
}