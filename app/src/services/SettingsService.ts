/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
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

@Service('settings')
@Inject('env', 'http')
class SettingsService {

  public static instance: SettingsService

  /* DO NOT TOUCH.
     Replaced with contents of VERSION file by release.sh */
  private VERSION = "%BUILD_OVERRIDE_VERSION%";
  private BUILD = "%BUILD_OVERRIDE_BUILD%";
  public static BUILD_NUM = "%BUILD_OVERRIDE_NUM%";
  public static EMBEDDED_HEATLEDGER_VERSION = "%BUILD_OVERRIDE_HEATLEDGER_VERSION%";
  public static EMBEDDED_HEATLEDGER_BUILD_DATE = "%BUILD_OVERRIDE_HEATLEDGER_BUILD_DATE%";

  /*public static WEBSOCKET_URL = 'settings.websocket_url';
  public static WEBSOCKET_URL_FALLBACK = 'settings.websocket_url_fallback';
  public static WEBSOCKET_URL_LOCALHOST = 'settings.websocket_url_localhost';
  public static RS_ADDRESS_PREFIX = 'settings.rs_address_prefix';
  public static ENGINE_TYPE = 'settings.engine_type';
  public static BASE_FEE = 'settings.base_fee';*/
  public static DATEFORMAT_DEFAULT = 'settings.dateformat_default';
  public static TIMEFORMAT_DEFAULT = 'settings.timeformat_default';
  public static APPLICATION_NAME = 'settings.application_name';
  public static APPLICATION_VERSION = 'settings.application_version';
  public static APPLICATION_BUILD = 'settings.application_build';
  public static SOCKET_RPC_TIMEOUT = 'settings.socket_rpc_timeout';
  public static SOCKET_RECONNECT_DELAY = 'settings.socket_reconnect_delay';
  public static LOG_API_ERRORS = 'settings.log_api_errors';
  public static LOG_API_ALL = 'settings.log_api_all';
  public static LOG_NOTIFY_ALL = 'settings.log_notify_all';
  public static DICE_WORD_FOLDER = 'settings.dice_word_folder';
  public static DICE_WORD_SUPPORTED_LANG = 'settings.dice_word_supported_lang';
  public static TRANSACTION_PROCESSING_VISUALIZATION = 'settings.transaction_processing_visualization';
  public static CAPTCHA_SITE_KEY = 'settings.captcha_site_key';
  public static CAPTCHA_POPUP = 'settings.captcha_popup';

  /* We are dropping the old CLOUD* and SOCKET* server api endpoints in favor of HEAT* server api */
  public static HEAT_RPC_TIMEOUT = 'settings.heat_rpc_timeout';
  public static HEAT_WEBSOCKET_REMOTE = 'settings.heat_websocket_remote';
  public static HEAT_WEBSOCKET_LOCAL = 'settings.heat_websocket_local';
  public static HEAT_WEBSOCKET = 'settings.heat_websocket';
  public static HEAT_MESSAGING = 'settings.heat_messaging';
  public static LOG_HEAT_ERRORS = 'settings.log_heat_errors';
  public static LOG_HEAT_ALL = 'settings.log_heat_all';
  public static LOG_HEAT_NOTIFY_ALL = 'settings.log_heat_notify_all';
  public static LOG_HEAT_SERVER_ALL = 'settings.log_heat_server_all';
  public static HEAT_HOST = 'settings.heat_host';
  public static HEAT_PORT = 'settings.heat_port';
  public static HEAT_HOST_REMOTE = 'settings.heat_host_remote';
  public static HEAT_PORT_REMOTE = 'settings.heat_port_remote';
  public static HEAT_HOST_LOCAL = 'settings.heat_host_local';
  public static HEAT_PORT_LOCAL = 'settings.heat_port_local';
  public static HEATLEDGER_CERTIFIER_ACCOUNT = 'settings.heatledger_certifier_account';
  public static HEATLEDGER_BTC_ASSET = 'settings.heatledger_btc_asset';
  public static HEATLEDGER_NAME_ASSIGNER = 'settings.heatledger_name_assigner';

  public static ETHPLORER_INFO_URL = 'settings.ethplorer_get_info_url';
  public static ETHERSCAN_BALANCES_URL = 'settings.etherscan_get_balances_url';
  public static ETHERSCAN_TRANSACTION_URL = 'settings.etherscan_get_transactions_url';
  public static ETHERSCAN_CONTRACT_ABI = 'settings.etherscan_get_contract_abi';

  public static ETHERSCAN_API_TOKEN = 'settings.etherscan_api.token';
  public static WEB3PROVIDER = 'settings.web3_provider';
  public static BIP44_WALLET = 'settings.bip44_wallet';
  public static ETH_TX_GAS_PRICE = 'settings.gas_price';
  public static ETH_TX_GAS_REQUIRED = 'settings.gas';

  public static BENCHMARK_WEB_URL = 'https://benchmarkrewards.com';

  public static FAILOVER_DESCRIPTOR: FailoverDescriptor;

  public static CRYPTO_NODES: CryptoNodesDescriptorMap[];
  public initialized: Promise<any>;
  failoverEnabled: boolean = true;

  /**
   * List of URLs that require API key
   */
  public static REQ_API_KEY_URLS: string[]
  static apiKey: string

  static getFailoverDescriptor(): FailoverDescriptor {
    if (!SettingsService.FAILOVER_DESCRIPTOR)
      SettingsService.FAILOVER_DESCRIPTOR =  {
        messaging: {host: "", port: 0, websocket: ""},
        failoverEnabled: false,
        heightDeltaThreshold: 2,
        balancesMismatchesThreshold: 0.9,
        balancesEqualityThreshold: 0.8,
        connectedPeersThreshold: 0.8,
        knownServers: []
      };
    return SettingsService.FAILOVER_DESCRIPTOR;
  }

  /**
   *
   * @param currency currency name- BTC, NXT etc
   * @param host hostname to be searched for in app-config.json
   * @param property name of the property of node to be updated- status, priotity
   * @param value value of property of node to be updated
   */
  static changeCryptoNodeProperty(currency: string, host: string, property: string, value: any) {
    if(!SettingsService.CRYPTO_NODES) return;
    let node = SettingsService.CRYPTO_NODES.find((descriptor) => descriptor.currencyName === currency).nodes.find(node => node.host === host)
    if(!node) return;
    node[property] = value;
  }

  static getCryptoServer(currency: string, index = 0): CryptoNodeDescriptor {
    let nodes = SettingsService.CRYPTO_NODES
        .find((descriptor) => descriptor.currencyName === currency)
        .nodes.filter(node => node.status === 'ACTIVE');
    return nodes.sort((n1, n2) => n1.priority < n2.priority ? -1 : 1)[index]
  }

  static getCryptoServerEndpoint(currency: string, index = 0): string {
    if (!SettingsService.CRYPTO_NODES) return "";

    let node = this.getCryptoServer(currency, index);
    if (!node) return "";
    return node.port ? `${node.host}:${node.port}` : `${node.host}`;
  }

  /**
   * set high failover priority for the host
   */
  static forceServerPriority(host: string, port: string) {
    let portNum = parseInt(port);
    for (const server of SettingsService.getFailoverDescriptor().knownServers) {
      if (server.host == host && server.port == portNum) {
        server.originalPriority = server.priority;
        server.priority = 0;
      } else {
        if (server.originalPriority) server.priority = server.originalPriority;
      }
    }
  }

  constructor(private env: EnvService,
              private http: HttpService) {

    this.applyFailoverConfig();

    /*this.settings[SettingsService.WEBSOCKET_URL] = 'wss://alpha.heatledger.com:8884/ws/';
    this.settings[SettingsService.WEBSOCKET_URL_FALLBACK] = [];
    this.settings[SettingsService.WEBSOCKET_URL_LOCALHOST] = 'ws://localhost:8884/ws/';
    this.settings[SettingsService.RS_ADDRESS_PREFIX] = 'HEAT';
    this.settings[SettingsService.ENGINE_TYPE] = 'heat';
    this.settings[SettingsService.BASE_FEE] = '0.1';*/

    /* @see http://blog.stevenlevithan.com/archives/date-time-format */
    this.values[SettingsService.DATEFORMAT_DEFAULT] = 'yyyy-mm-dd HH:MM:ss';
    this.values[SettingsService.TIMEFORMAT_DEFAULT] = 'HH:MM:ss';

    this.values[SettingsService.APPLICATION_NAME] = 'Heatwallet';
    this.values[SettingsService.APPLICATION_VERSION] = this.VERSION;
    this.values[SettingsService.APPLICATION_BUILD] = this.BUILD;
    this.values[SettingsService.SOCKET_RPC_TIMEOUT] = 30 * 1000;
    this.values[SettingsService.SOCKET_RECONNECT_DELAY] = 2000;
    this.values[SettingsService.LOG_API_ERRORS] = true;
    this.values[SettingsService.LOG_API_ALL] = false;
    this.values[SettingsService.LOG_NOTIFY_ALL] = false;

    this.values[SettingsService.DICE_WORD_FOLDER] = "dice-words";
    this.values[SettingsService.DICE_WORD_SUPPORTED_LANG] = {
      "de": ["de.txt","677da2d5148342780f3cd1b09eaf489fac4ba00fe1083ba3296d41bdf088f471"],
      "en": ["en.txt","b329cea782bdd8b1de49bbb9fbdef9e8230e15eb08f0d7952613992246c38f96"],
      "fi": ["fi.txt","62323e0dc9ee39e191c98a361f20aa1417cb58da2eb5e40b9008d7973017d138"],
      "fr": ["fr.txt","9f6e8d4845ff178cdfe8215976adeaab9e9ebaa88ab2e8ca4de14cc7a1e1989c"],
      "it": ["it.txt","9a14dadd488e0fba95597c0b892320145d563a8b0554911af485179e91211847"],
      "jp": ["jp.txt","b9a5e099990617e058315f98def2ff5cd1be2d65178511d93c22153f20b6d164"],
      "nl": ["nl.txt","67b8baf68345041b029dd72fc51d1bd71c806587979d4ba7542c2534f1612168"],
      "pl": ["pl.txt","3822db4a595364dd44f8791f523c3482d4f1276ef31bb64e10d2cd2bb4e40a99"],
      "sv": ["sv.txt","87d1bf55193c95c03aa8e0d221dfaa94ccd8d6ea153b3d735eac235d592273fe"]
    };

    // Uncomment to switch between backend servers..

    this.values[SettingsService.HEAT_WEBSOCKET_REMOTE] = "wss://heat1.heatwallet.com/ws/";
    this.values[SettingsService.HEAT_HOST_REMOTE] = "https://heat1.heatwallet.com"; // mainnet
    this.values[SettingsService.HEAT_PORT_REMOTE] = "";

    // this.settings[SettingsService.HEAT_WEBSOCKET_REMOTE] = "wss://heatwallet.com:7755/ws/";
    // this.settings[SettingsService.HEAT_HOST_REMOTE] = "https://heatwallet.com"; // mainnet
    // this.settings[SettingsService.HEAT_PORT_REMOTE] = "7734";

    this.values[SettingsService.HEAT_RPC_TIMEOUT] = 30 * 1000;
    this.values[SettingsService.HEAT_WEBSOCKET_LOCAL] = "ws://localhost:7755/ws/";
    this.values[SettingsService.LOG_HEAT_ERRORS] = true;
    this.values[SettingsService.LOG_HEAT_ALL] = false;
    this.values[SettingsService.LOG_HEAT_NOTIFY_ALL] = true;
    this.values[SettingsService.LOG_HEAT_SERVER_ALL] = false;

    this.values[SettingsService.HEAT_HOST_LOCAL] = "http://localhost";
    this.values[SettingsService.HEAT_PORT_LOCAL] = "7733";
    this.values[SettingsService.HEATLEDGER_CERTIFIER_ACCOUNT] = '2243498237075721643';
    this.values[SettingsService.HEATLEDGER_BTC_ASSET] = '5592059897546023466';
    this.values[SettingsService.HEATLEDGER_NAME_ASSIGNER] = '14439304480879065693';

    this.values[SettingsService.TRANSACTION_PROCESSING_VISUALIZATION] = 111; /* Use 666 for longer visuals */
    this.values[SettingsService.CAPTCHA_SITE_KEY] = "6Le7pBITAAAAANPHWrIsoP_ZvlxWr0bSjOPrlszc";
    this.values[SettingsService.CAPTCHA_POPUP] = "https://heatwallet.com/captcha.html";

    this.values[SettingsService.ETHPLORER_INFO_URL] = "https://api.ethplorer.io/getAddressInfo/:address?apiKey=lwA5173TDKj60";
    this.values[SettingsService.ETHERSCAN_BALANCES_URL] = "https://api.etherscan.io/api?module=account&action=balancemulti&address=:addresses&tag=latest&apikey=:apiToken";
    this.values[SettingsService.ETHERSCAN_TRANSACTION_URL] = "https://api.etherscan.io/api?module=account&action=txlist&address=:address&startblock=0&endblock=99999999&page=:page&offset=:offset&sort=desc&apikey=:apiToken";
    this.values[SettingsService.ETHERSCAN_CONTRACT_ABI] = "https://api.etherscan.io/api?module=contract&action=getabi&address=:address&apikey=:apiToken"

    this.values[SettingsService.ETHERSCAN_API_TOKEN] = "S54GZXNCVGEAVCF1AQZZ8A8WDMQ9811HW9";
    this.values[SettingsService.WEB3PROVIDER] = "https://mainnet.infura.io/OT4wn16VtAydG2y9NVna";
    this.values[SettingsService.ETH_TX_GAS_PRICE] = 20000000000;
    this.values[SettingsService.ETH_TX_GAS_REQUIRED] = 21000;
    this.values[SettingsService.BIP44_WALLET] = "m/44'/60'/0'/0";

    /* Override with test endpoints */
    if (heat.isTestnet) {
      this.values[SettingsService.HEAT_HOST_REMOTE] = "https://alpha.heatledger.com"; // testnet
      this.values[SettingsService.HEAT_PORT_REMOTE] = "7734"; // testnet
      this.values[SettingsService.HEATLEDGER_CERTIFIER_ACCOUNT] = '4729421738299387565';
      this.values[SettingsService.HEATLEDGER_BTC_ASSET] = '2801534132504071984';
      this.values[SettingsService.HEATLEDGER_NAME_ASSIGNER] = '0000000';
      this.values[SettingsService.HEAT_WEBSOCKET_REMOTE] = "wss://alpha.heatledger.com:7755/ws/";
    }

    /* betanet overrides */
    if (heat.isBetanet) {
      this.values[SettingsService.HEAT_PORT_REMOTE] = "7762";
      this.values[SettingsService.HEAT_PORT_LOCAL] = "7761";
      this.values[SettingsService.HEAT_WEBSOCKET_REMOTE] = "wss://heatwallet.com:7763/ws/";
      this.values[SettingsService.HEAT_WEBSOCKET_LOCAL] = "ws://localhost:7763/ws/";
    }

    this.values[SettingsService.HEAT_HOST] = this.values[SettingsService.HEAT_HOST_REMOTE];
    this.values[SettingsService.HEAT_PORT] = this.values[SettingsService.HEAT_PORT_REMOTE];
    this.values[SettingsService.HEAT_WEBSOCKET] = this.values[SettingsService.HEAT_WEBSOCKET_REMOTE];

    let usingServerValue = sessionStorage.getItem(heat.serverDescriptionKey)
    if (usingServerValue) {
      try {
        let usingServer: ServerDescriptor = JSON.parse(usingServerValue)
        this.values[SettingsService.HEAT_HOST] = usingServer.host
        this.values[SettingsService.HEAT_PORT] = usingServer.port
        this.values[SettingsService.HEAT_WEBSOCKET] = usingServer.websocket
      } catch (e) {
        console.error("error on process sessionStorage value by key " + heat.serverDescriptionKey, e)
      }
    }

    this.generateApiKeyForBrowser()

    SettingsService.instance = this

    // this.initialized.then(value => {
    //   this.setHost("local", false, true)
    // })
  }

  values = {}

  public setConnectionWay(connectionWay: {way: "local" | "remote", failoverEnabled: boolean, sameMessagingHost: boolean}) {
    this.failoverEnabled = connectionWay.failoverEnabled;
    this.values[SettingsService.HEAT_HOST] =
      this.values[connectionWay.way == "local" ? SettingsService.HEAT_HOST_LOCAL : SettingsService.HEAT_HOST_REMOTE]
    this.values[SettingsService.HEAT_PORT] =
      this.values[connectionWay.way == "local" ? SettingsService.HEAT_PORT_LOCAL : SettingsService.HEAT_PORT_REMOTE]
    this.values[SettingsService.HEAT_WEBSOCKET] =
      this.values[connectionWay.way == "local" ? SettingsService.HEAT_WEBSOCKET_LOCAL : SettingsService.HEAT_WEBSOCKET_REMOTE]
    this.values[SettingsService.HEAT_MESSAGING] = connectionWay.sameMessagingHost
      ? {
        host: this.values[SettingsService.HEAT_HOST],
        port: this.values[SettingsService.HEAT_PORT],
        websocket: this.values[SettingsService.HEAT_WEBSOCKET]
      }
      : SettingsService.FAILOVER_DESCRIPTOR.messaging
  }

  public get(id:string) {
    return this.values[id];
  }

  public put(id:string,value:string) {
    return this.values[id]=value;
  }

  public setCurrentServer(server: ServerDescriptor) {
    this.values[SettingsService.HEAT_HOST] = server.host;
    this.values[SettingsService.HEAT_PORT] = server.port;
    this.values[SettingsService.HEAT_WEBSOCKET] = server.websocket;
  }

  public getCurrentServer(): ServerDescriptor {
    return {
      host: this.values[SettingsService.HEAT_HOST],
      port: this.values[SettingsService.HEAT_PORT],
      websocket: this.values[SettingsService.HEAT_WEBSOCKET]
    }
  }

  getHeatwalletConfigFilePath() {
    let fileName = 'app-config.json'
    if (this.env.isBrowser) {
      return fileName
    }
    if (this.env.isNodeEnv) {
      let path = require('path')
      return path.join(__dirname, '..', '..', fileName)
    }
  }

  public applyFailoverConfig() {
    let resolveFailoverDescriptor = (json: any) => {
      if (heat.isTestnet) {
        SettingsService.FAILOVER_DESCRIPTOR = json.heatNodes.testnet;
      } else if (heat.isBetanet) {
        SettingsService.FAILOVER_DESCRIPTOR = json.heatNodes.betanet;
      } else {
        SettingsService.FAILOVER_DESCRIPTOR = json.heatNodes.mainnet;
      }
      this.values[SettingsService.HEAT_MESSAGING] = SettingsService.FAILOVER_DESCRIPTOR.messaging;
      SettingsService.CRYPTO_NODES = json.cryptoNodes;
      this.failoverEnabled = SettingsService.FAILOVER_DESCRIPTOR.failoverEnabled || true;
    };
    this.initialized = new Promise<void>((resolve, reject) => {
      if (this.env.isBrowser) {
        this.http.get('app-config.json').then((json: any) => {
          resolveFailoverDescriptor(json);
          resolve();
        }, (reason) => {
          let message = "Cannot load 'app-config.json': " + reason ? reason : "";
          console.log(message);
          reject(message);
        });
      } else if (this.env.isNodeEnv) {
        // @ts-ignore
        const fs = require('fs');
        fs.readFile(this.getHeatwalletConfigFilePath(), (err, data) => {
          if (err) {
            let message = `Cannot load '${this.getHeatwalletConfigFilePath()}'. Error: ${err}`;
            console.log(message);
            reject(message);
            throw err;
          }
          let json = JSON.parse(data);
          resolveFailoverDescriptor(json);
          resolve();
        });
      }
    });
  }

  generateApiKeyForBrowser() {
    if (!SettingsService.REQ_API_KEY_URLS) {
      //fill list of service urls that required api key added to url
      this.initialized.then(value => {
        let ar: CryptoNodeDescriptor[] = []
        SettingsService.CRYPTO_NODES.forEach(v => ar.push(...v.nodes))
        SettingsService.REQ_API_KEY_URLS = ar.filter(v => v.status == 'ACTIVE')
            .map(v => v.host)
            .filter(v => v.indexOf("heatwallet.com") > -1)
            || []
        return value
      })
    }

    //generate api key
    const now = new Date()
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 0))
    // @ts-ignore
    const diff = now - startOfYear
    const oneDay = 1000 * 60 * 60 * 24
    const dayOfYear = Math.floor(diff / oneDay)
    const hashInput = `${now.getUTCFullYear()}-${dayOfYear}`

    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      SettingsService.apiKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    })
  }

}

interface ServerDescriptor {
  host: string;
  port: number;
  websocket: string;
  originalPriority?: number;
  priority?: number;
  health?: IHeatServerHealth;
  statusScore?: number;
  statusError?: any;
}

interface FailoverDescriptor {
  failoverEnabled: boolean;
  heightDeltaThreshold: number;  // e.g.  2 means 2 blocks ahead
  balancesMismatchesThreshold: number;  // 0 - 1
  balancesEqualityThreshold: number;  // 0 - 1
  connectedPeersThreshold: number;  // 0 - 1
  knownServers: ServerDescriptor[];
  messaging: { //central messaging/signaling host
    host: string;
    port: number;
    websocket: string;
  }
  signalingUrl?: string;  //central WebRTC signaling server, regardless the choosed server
}

interface CryptoNodesDescriptorMap {
  currencyName: string;
  nodes: CryptoNodeDescriptor[];
}

interface CryptoNodeDescriptor {
  host: string;
  port?: number;
  priority: number;
  status?: string;
  timeout?: number;
}
