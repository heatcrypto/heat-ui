@Service('iotaBlockExplorerService')
@Inject('$q', 'http', '$window', 'settings')
class IotaBlockExplorerService {
  private iotaCore;
  public iotaAPI: Promise<any>;
  private cachedGetCachedAccountInfo: Map<string, any> = new Map<string, any>();

  constructor(
    private $q: angular.IQService,
    private http: HttpService,
    private $window: angular.IWindowService,
    private settingsService: SettingsService) {

    this.iotaCore = $window.heatlibs.IotaCore;

    this.iotaAPI = new Promise<any>(resolve => {
      this.settingsService.initialized.then(
        () => {
          resolve(this.iotaCore.composeAPI(
            {provider: SettingsService.getCryptoServerEndpoint('IOTA')}
          ))
        }
      );
    })
  }

  //deprecated
  private getTransactions = (seed: string, startKeyIndex: number = 0, security: number = 2) => {
    let deferred = this.$q.defer<IotaGetAccount>();
    this.iotaAPI
      .then(api => api.getAccountData(seed, {start: startKeyIndex, security: security}))
      .then(accountData => {
        let data = JSON.parse(typeof accountData === "string" ? accountData : JSON.stringify(accountData))
        if (data.transfers) {
          deferred.resolve(data)
        } else {
          deferred.reject(`Unable to fetch IOTA address data`)
        }
      }, reason => {
        deferred.reject(reason)
      })
      .catch(reason => console.error(reason))
    return deferred.promise;
  }

  public getAccountInfo = (seed: string, startKeyIndex: number = 0, security: number = 2) => {
    let result: Promise<IotaAccountInfo> = this.cachedGetCachedAccountInfo.get(seed)
    if (result) return result
    result = this.iotaAPI
      .then(api => api.getAccountData(seed, {start: startKeyIndex, security: security}))
      .then(accountData => {
        let collapsed = this.collapseTransfers(accountData.transfers).filter(v => !!v)
        let v: IotaAccountInfo = {accountData: accountData, transfers: collapsed}
        return v
      })
    setTimeout(() => {
      this.cachedGetCachedAccountInfo.set(seed, null)
    }, 60 * 1000)
    this.cachedGetCachedAccountInfo.set(seed, result)
    return result
  }

  public sendIota = (seed: string, transfers: any[]) => {
    let deferred = this.$q.defer<any>();
    const depth = 3
    const minWeightMagnitude = 14
    this.iotaAPI.then(api => {
      api.prepareTransfers(seed, transfers)
        .then(trytes => api.sendTrytes(trytes, depth, minWeightMagnitude))
        .then(bundle => deferred.resolve(bundle))
        .catch(err => {
          deferred.reject(err)
        })
    })
    return deferred.promise;
  }

  public getBalance = (address: string) => {
    if (address.length === 90)
      address = address.slice(0, 81)
    let deferred = this.$q.defer<any>();
    this.iotaAPI
      .then(api => api.getBalances([address], 100))
      .then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
        deferred.resolve(data.balances[0])
      })
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public getAddressBundles = (address: string) => {
    if (address.length === 90)
      address = address.slice(0, 81)
    let deferred = this.$q.defer<any>();
    this.iotaAPI
      .then(api => api.getBundlesFromAddresses([address]))
      .then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
        deferred.resolve(data)
      })
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public getInputs = (seed: string) => {
    let deferred = this.$q.defer<any>();
    this.iotaAPI
      .then(api => api.getInputs(seed, {start: 0, security: 2}))
      .then(ret => {
        let data = JSON.parse(typeof ret === "string" ? ret : JSON.stringify(ret))
        deferred.resolve(data)
      })
      .catch(err => {
        deferred.reject(err)
      })
    return deferred.promise;
  }

  public checkAddressReuse = (address: string) => {
    if (address.length === 90)
      address = address.slice(0, 81)
    let deferred = this.$q.defer<any>();
    this.getAddressBundles(address).then(bundles => {
      bundles.forEach(transactions => {
        transactions.forEach(tx => {
          if (tx.address === address && tx.value < 0) {
            deferred.resolve(true)
            return true;
          }
        });
      });
      deferred.resolve(false)
    }).catch(err => {
      deferred.reject(err)
    })
    return deferred.promise;
  }

  /**
   * Convert bundles (4 transactions) to the transfer object.
   * Typical bundle consist of 4 transactions:
   * 0: Output. Recipient of the transaction	>0 (as defined by user)
   * 1: <0 (spending of input)
   * 2: Second half of Alice's signature. =0
   * 3: Output. Remainder.	(input - output) > 0
   */
  //deprecated, use IotaBlockExplorerService.collapseTransfers()
  public getTransfers(addresses): Promise<IotaTransfer[]> {
    return this.iotaAPI.then(api => {
      return api.findTransactions({addresses: addresses})
        .then(hashes => api.getTransactionObjects(hashes))
        .then(transactions => {
          let tailHashes = []
          for (const t of transactions) {
            if (!t.address.startsWith("999999999999999999999999999") && t.currentIndex === 0) {
              tailHashes.push(t.hash)
            }
          }
          return tailHashes
        })
        .then(tailHashes => {
          let result: Promise<IotaTransfer>[] = []
          for (let j in tailHashes) {
            let tailHash = tailHashes[j]
            result.push(api.getBundle(tailHash).then(bundle => {
                if (bundle.length === 4) {
                  let transfer: IotaTransfer = {
                    timestamp: bundle[0].timestamp,
                    from: bundle[1].address,
                    to: bundle[0].address,
                    amount: bundle[0].value,
                    hash: bundle[0].hash,
                    trunkTransaction: bundle[bundle.length - 1].trunkTransaction,
                    branchTransaction: bundle[bundle.length - 1].branchTransaction
                  }
                  console.log(transfer)
                  return transfer
                }
                return null;
              }, reason => console.log("rejected " + reason))
              .catch(reason => {
                console.error(`Error on getting IOTA bundle: ${reason}`)
                return reason
              })
            )
          }
          return Promise.all(result)
        })
    })
  }

  //alternative to IotaBlockExplorerService.getTransfers()
  public collapseTransfers(transfers: any[]): IotaTransfer[] {
    return transfers.map(v => {
      if (v.length === 4) {
        let transfer: IotaTransfer = {
          timestamp: v[0].timestamp,
          from: v[1].address,
          to: v[0].address,
          amount: v[0].value,
          hash: v[0].hash,
          trunkTransaction: v[v.length - 1].trunkTransaction,
          branchTransaction: v[v.length - 1].branchTransaction
        }
        return transfer
      }
    })
  }

}

interface IotaGetAccount {
  transactions: any[],
  transfers: any[],
  balance: number,
  addresses: string[]
}

interface IotaTransfer {
  timestamp: number,
  from: string,
  to: string,
  amount: number,
  hash: string,
  trunkTransaction: string,
  branchTransaction: string
}

interface IotaAccountInfo {
  accountData: any,
  transfers: IotaTransfer[]
}
