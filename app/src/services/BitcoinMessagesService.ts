@Service('bitcoinMessagesService')
class BitcoinMessagesService {

  public messages: {[address:string]:Array<{txId:string,message:string}>} = {}
  private listeners: Array<(removed?: boolean)=>void> = []

  constructor() {
    this.readLocalStorage()
  }

  readLocalStorage() {
    this.messages = {}
    for (let i=0; i<window.localStorage.length; i++) {
      let key = window.localStorage.key(i)
      if (key.startsWith('btcMessages:')) {
        let parts = key.split(':'), addr = parts[1],  txId = parts[2], message = `${parts[3]}:${parts[4]}`
        this.messages[addr] = this.messages[addr] || []
        this.messages[addr].push({txId, message});
      }
    }
  }

  add(address:string, txId:string, message: string) {
    window.localStorage.setItem(`btcMessages:${address}:${txId}:${message}`, "1")
    this.readLocalStorage()
    this.notifyListeners(false)
  }

  remove(address:string, txId:string, message: string) {
    window.localStorage.removeItem(`btcMessages:${address}:${txId}:${message}`)
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