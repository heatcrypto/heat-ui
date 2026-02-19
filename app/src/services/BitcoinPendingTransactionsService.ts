@Service('bitcoinPendingTransactions')
@Inject('$q', 'http', 'settings','btcBlockExplorerService')
class BitcoinPendingTransactionsService {

  public pending: { [address: string]: Array<{ txId: string, time: number, amount: string }> } = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settings: SettingsService,
              private btcBlockExplorerService: BtcBlockExplorerService) {
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
      if (key.startsWith('btcPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txId = parts[2], time = parseInt(parts[3])
        let minutesOld = (Date.now() - time) / (1000 * 60)
        if (minutesOld > 60) {
          oldKeys.push({addr, txId, time})
        } else {
          let amount = window.localStorage.getItem(key)
          this.pending[addr] = this.pending[addr] || []
          this.pending[addr].push({txId: txId, time: time, amount})
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

  add(address:string, txId:string, timestamp: number, totalAmount) {
    window.localStorage.setItem(`btcPendingTxn:${address}:${txId}:${timestamp}`, totalAmount)
    this.loadData()
    this.notifyListeners(false)
  }

  remove(address:string, txId:string, timestamp: number) {
    window.localStorage.removeItem(`btcPendingTxn:${address}:${txId}:${timestamp}`)
    this.loadData()
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