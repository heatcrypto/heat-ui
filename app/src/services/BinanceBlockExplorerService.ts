@Service('bnbBlockExplorerService')
@Inject('http', '$q', '$interval', '$window')
class BnbBlockExplorerService {
  private binanceDex: string;
  private bnb: any;
  private bnbVersion: string;

  private btcProvider: IBitcoinAPIList;
  constructor(private http: HttpService,
              private $q: angular.IQService,
              private $interval: angular.IIntervalService,
              private $window: angular.IWindowService) {
    this.binanceDex = 'https://testnet-dex.binance.org/';
    this.bnb = $window.heatlibs.bnb;
    this.bnbVersion = 'testnet'
  }

  public getBalance = (address: string) => {
    let deferred = this.$q.defer<any>();
    this.getAddressInfo(address).then(info => {
      if (info) {
        let totalBalance = info.balances.reduce( function(a, b) {
          if (b['symbol'] === 'BNB') {
            a += parseFloat(b['free']);
          }
          return a;
        }, 0);
        deferred.resolve(totalBalance)
      }
      deferred.resolve(0)
    }, ()=> {
      deferred.reject(`Unable to fetch BNB balance`)
    })
    return deferred.promise
  }

  public getTransactions = (address: string, startTime: number, endTime: number, limit: number, offset: number): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    let url = this.binanceDex + 'api/v1/transactions/?address=' + address +
              '&startTime=' + startTime +
              '&endTime=' + endTime +
              '&limit=' + limit +
              '&offset=' + offset;
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data.tx)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch BNB transaction data`)
    })
    return deferred.promise
  }

  public getTransactionCount = (address: string): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    let currentDate = new Date();
    let endTime = currentDate.getTime();
    let startTime = new Date(new Date().setMonth(currentDate.getMonth()- 3)).getTime();      

    let url = this.binanceDex + 'api/v1/transactions/?' +
              'address=' + address +
              '&startTime=' + startTime +
              '&endTime=' + endTime;
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data.total) {
        deferred.resolve(data.total)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch BNB transaction count`)
    })
    return deferred.promise
  }

  public getAddressInfo = (address: string): angular.IPromise<any> => {
    let deferred = this.$q.defer<any>();
    let url = this.binanceDex + 'api/v1/account/' + address;
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        deferred.resolve(data)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch BNB address data`)
    })
    return deferred.promise
  }

  public getEstimatedFee = () => {
    let deferred = this.$q.defer<any>();
    let url = this.binanceDex + 'api/v1/fees';
    this.http.get(url).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        let estimatedFee = '0';
        let sendFeeObject = data.find(fee => fee.fixed_fee_params && fee.fixed_fee_params.msg_type === 'send')
        estimatedFee = (sendFeeObject.fixed_fee_params.fee / 100000000).toFixed(8);
        deferred.resolve(estimatedFee)
      }
    }, ()=> {
      deferred.reject(`Unable to fetch BNB address data`)
    })
    return deferred.promise
  }

  public broadcast = (txObject: any) : any => {
    let deferred = this.$q.defer<any>();
    const addressFrom = txObject.from;
    const addressTo = txObject.to;
    const amount = txObject.amount;
    const asset = 'BNB';
    const message = txObject.message;
    const privateKey = txObject.privateKey;
    const sequenceURL = `${this.binanceDex}api/v1/account/${addressFrom}/sequence`;        
    
    const bnbClient = new this.bnb(this.binanceDex);
    bnbClient.chooseNetwork(this.bnbVersion);
    bnbClient.setPrivateKey(privateKey);
    bnbClient.initChain();

    this.http.get(sequenceURL).then(info => {
      let data = JSON.parse(typeof info === "string" ? info : JSON.stringify(info))
      if (data) {
        const sequence = data.sequence || 0
        return bnbClient.transfer(addressFrom, addressTo, amount, asset, message, sequence)
      }
    }, ()=> {
      deferred.reject('Unable to obtain acoount sequence value');      
    }).then((result) => {
      if (result.status === 200) {
        deferred.resolve(result.result[0])
      } else {
        deferred.reject(`Unable to send binance coins`)
      }
    })
    .catch((error) => {
      deferred.reject(`Unable to send binance coins`)
    });

    return deferred.promise
  }

}
