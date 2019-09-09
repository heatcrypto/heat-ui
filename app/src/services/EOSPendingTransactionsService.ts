@Service('eosPendingTransactions')
@Inject('$q')
class EosPendingTransactionsService {

  public pending: {[address:string]:Array<{txHash:string,timestamp:number}>} = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor(public $q: angular.IQService) {
    this.readLocalStorage()
  }

  readLocalStorage() {
    this.pending = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('eosPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txHash = parts[2], timestamp = parseInt(parts[3])
        this.pending[addr] = this.pending[addr] || []
        this.pending[addr].push({txHash:txHash, timestamp: timestamp});
      }
    }
  }

  add(address:string, txHash:string, timestamp: number) {
    window.localStorage.setItem(`eosPendingTxn:${address}:${txHash}:${timestamp}`, "1")
    this.readLocalStorage()
    this.notifyListeners(false)
  }

  remove(address:string, txHash:string, timestamp: number) {
    window.localStorage.removeItem(`eosPendingTxn:${address}:${txHash}:${timestamp}`)
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