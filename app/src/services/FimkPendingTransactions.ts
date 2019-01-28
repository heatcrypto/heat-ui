@Service('fimkPendingTransactions')
@Inject('$q', 'http', 'settings','mofoSocketService')
class FimkPendingTransactionsService {

  public pending: {[address:string]:Array<{txId:string,time:number}>} = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor(public $q: angular.IQService,
              private http: HttpService,
              private settings: SettingsService,
              private mofoSocketService: MofoSocketService) {
    this.readLocalStorage()
  }

  readLocalStorage() {
    this.pending = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('fimkPendingTxn:')) {
        let parts = key.split(':'), addr = parts[1],  txId = parts[2], time = parseInt(parts[3])
        this.pending[addr] = this.pending[addr] || []
        this.pending[addr].push({txId:txId, time: time});
      }
    }
  }

  add(address:string, txId:string, timestamp: number) {
    window.localStorage.setItem(`fimkPendingTxn:${address}:${txId}:${timestamp}`, "1")
    this.readLocalStorage()
    this.notifyListeners(false)
  }

  remove(address:string, txId:string, timestamp: number) {
    window.localStorage.removeItem(`fimkPendingTxn:${address}:${txId}:${timestamp}`)
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