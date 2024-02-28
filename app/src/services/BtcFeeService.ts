@Service('btcFeeService')
@Inject('http', '$q', '$window')
class BtcFeeService {

    static endPoint1 = 'https://bitcoinfees.net/api.json'
    static endPoint2 = 'https://btc1.heatwallet.com/api/v1/estimatefee'

    constructor(private http: HttpService,
                private $q: angular.IQService,
                private $window: angular.IWindowService) {
    }

    /*
    result example
    {
      "1":18,"3":18,"6":14
    }
     */

    public getSatByteFee = () => {
        let deferred = this.$q.defer()
        this.getSatByteFeeByMethod1().then((result)  => {
            deferred.resolve(result)
        }).catch(reason => {
            console.log("error on getting fee for btc by method 1. " + (reason || ""))
            return this.getSatByteFeeByMethod2()
        }).then((result) => {
            deferred.resolve(result)
        }).catch(reason => {
            let s = "error on getting fee for btc by method 2. " + (reason || "")
            console.log(s)
            deferred.reject(s)
        })
        return deferred.promise
    }

    public getSatByteFeeByMethod1 = () => {
        /*response example
        {
            "1":18059,"3":18059,"6":14090
        }*/
        return this.http.get(BtcFeeService.endPoint1).then(response => {
            let parsed = utils.parseResponse(response)
            if (parsed.heatUtilParsingError) throw new Error(parsed.heatUtilParsingError)
            let fees = parsed.fee_by_block_target
            let result = {
                "1": Math.ceil(fees["1"] / 1000),
                "3": Math.ceil(fees["3"] / 1000),
                "6": Math.ceil(fees["6"] / 1000),
                "12": Math.ceil(fees["12"] / 1000)
            }
            return result
        })
    }

    public getSatByteFeeByMethod2 = () => {
        let result = {}

        let responseHandler = (blocksNum) => (response) => {
            let parsed = utils.parseResponse(response)
            if (parsed.heatUtilParsingError) throw new Error(parsed.heatUtilParsingError)
            let btcKByteFee = parsed.result
            result[`${blocksNum}`] = Math.ceil(btcKByteFee * 100000000 / 1024)
            return result
        }

        return this.http.get(`${BtcFeeService.endPoint2}/1`, true)
            .then(responseHandler(1))
            .then((v) => this.http.get(`${BtcFeeService.endPoint2}/3`, true))
            .then(responseHandler(3))
            .then((v) => this.http.get(`${BtcFeeService.endPoint2}/6`, true))
            .then(responseHandler(6))
            .then((v) => this.http.get(`${BtcFeeService.endPoint2}/12`, true))
            .then(responseHandler(12))
    }

}