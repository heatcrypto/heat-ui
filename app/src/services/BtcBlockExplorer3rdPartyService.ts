@Service('btcBlockExplorer3rdPartyService')
@Inject('http', '$q', '$window')
class BtcBlockExplorer3rdPartyService implements IBitcoinAPIList {

  public static endPoint: string;
  private static token = 'd7995959366d4369976aabb3355c7216'
  private bitcore;

  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $window: angular.IWindowService) {
    BtcBlockExplorer3rdPartyService.endPoint = 'https://api.blockcypher.com/v1/btc/main';
    this.bitcore = $window.heatlibs.bitcore;
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<number>();
    this.getAddressInfo(address).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.final_balance)
    }, () => {
      deferred.reject()
    })
    return deferred.promise
  }

  public getTransactions = (address: string, from: number, to: number): angular.IPromise<any> => {
    let pageNum = 0;
    pageNum = (to / 10) - 1;
    let getTransactionsApi = `https://blockexplorer.com/api/txs/?address=${address}&pageNum=${pageNum}`;
    let deferred = this.$q.defer();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed.txs)
    }, () => {
      deferred.reject();
    })
    return deferred.promise;
  }

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let getTransactionsApi = `${BtcBlockExplorer3rdPartyService.endPoint}/addrs/${address}?token=${BtcBlockExplorer3rdPartyService.token}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTransactionsApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getEstimatedFee = () => {
    let getEstimatedFeeApi = `https://bitcoinfees.earn.com/api/v1/fees/list`;
    let deferred = this.$q.defer();
    let fee = 20;
    this.http.get(getEstimatedFeeApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      parsed.fees.forEach(feeObject => {
        if (feeObject.maxDelay == 1) {
          fee = feeObject.minFee
        }
      });
      if (!fee)
        fee = 20
      deferred.resolve(fee);
    }, () => {
      deferred.resolve(fee);
    })
    return deferred.promise
  }

  public getTxInfo = (txId: string) => {
    let getTxInfoApi = `${BtcBlockExplorer3rdPartyService.endPoint}/tx/${txId}?token=${BtcBlockExplorer3rdPartyService.token}`;
    let deferred = this.$q.defer<any>();
    this.http.get(getTxInfoApi).then(response => {
      let parsed = angular.isString(response) ? JSON.parse(response) : response;
      deferred.resolve(parsed);
    }, () => {
      deferred.reject();
    })
    return deferred.promise
  }

  public getUnspentUtxos(addresses) {
    const Address = this.bitcore.Address;
    const Transaction = this.bitcore.Transaction;
    const UnspentOutput = Transaction.UnspentOutput;
    return new Promise((resolve, reject) => {
      if (!Array.isArray(addresses)) {
        addresses = [addresses];
      }
      addresses = addresses.map((address) => new Address(address));
      this.http.post(`https://insight.bitpay.com/api/addrs/utxo`, {
        addrs: addresses.map((address) => address.toString()).join(',')
      }).then(
        response => {
          try {
            resolve((<[any]>response).map(unspent => new UnspentOutput(unspent)))
          } catch (ex) {
            reject(ex);
          }
        },
        error => {
          reject(error)
        }
      )
    })
  }

  public broadcast = (rawTx: string) => {
    return new Promise<{ txId: string }>((resolve, reject) => {
      this.http.post(`https://insight.bitpay.com/api/tx/send`, { rawtx: rawTx }).then(
        response => {
          let txId = response ? response['txid'] : null
          resolve({ txId: txId })
        },
        error => {
          reject(error)
        }
      )
    })
  }
}