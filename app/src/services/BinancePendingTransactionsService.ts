@Service('binancePendingTransactions')
@Inject('$q', 'http', 'settings','bnbBlockExplorerService')
class BinancePendingTransactionsService {

  public pending: {[address:string]:Array<{txId:string,time:number}>} = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settings: SettingsService,
              private bnbBlockExplorerService: BnbBlockExplorerService) {
    this.readLocalStorage()
  }

  readLocalStorage() {
    this.pending = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('bnbPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txId = parts[2], time = parseInt(parts[3])
        this.pending[addr] = this.pending[addr] || []
        this.pending[addr].push({txId:txId, time: time});
      }
    }
  }

  add(address:string, txId:string, timestamp: number) {
    window.localStorage.setItem(`bnbPendingTxn:${address}:${txId}:${timestamp}`, "1")
    this.readLocalStorage()
    this.notifyListeners(false)
  }

  remove(address:string, txId:string, timestamp: number) {
    window.localStorage.removeItem(`bnbPendingTxn:${address}:${txId}:${timestamp}`)
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