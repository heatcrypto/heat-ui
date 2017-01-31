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
class SettingsService {

  /* DO NOT TOUCH.
     Replaced with contents of VERSION file by release.sh */
  private VERSION = "%BUILD_OVERRIDE_VERSION%";
  private BUILD = "%BUILD_OVERRIDE_BUILD%";

  public static WEBSOCKET_URL = 'settings.websocket_url';
  public static WEBSOCKET_URL_FALLBACK = 'settings.websocket_url_fallback';
  public static WEBSOCKET_URL_LOCALHOST = 'settings.websocket_url_localhost';
  public static RS_ADDRESS_PREFIX = 'settings.rs_address_prefix';
  public static ENGINE_TYPE = 'settings.engine_type';
  public static BASE_FEE = 'settings.base_fee';
  public static DATEFORMAT_DEFAULT = 'settings.dateformat_default';
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
  public static NEWS_URL = 'settings.news_url';
  public static CAPTCHA_SITE_KEY = 'settings.captcha_site_key';
  public static CAPTCHA_POPUP = 'settings.captcha_popup';

  /* We are dropping the old CLOUD* and SOCKET* server api endpoints in favor of HEAT* server api */
  public static HEAT_RPC_TIMEOUT = 'settings.heat_rpc_timeout';
  public static HEAT_WEBSOCKET_URL = 'settings.heat_websocket_url';
  public static LOG_HEAT_ERRORS = 'settings.log_heat_errors';
  public static LOG_HEAT_ALL = 'settings.log_heat_all';
  public static LOG_HEAT_NOTIFY_ALL = 'settings.log_heat_notify_all';
  public static HEAT_HOST = 'settings.heat_host';
  public static HEAT_PORT = 'settings.heat_port';
  public static HEAT_HOST_REMOTE = 'settings.heat_host_remote';
  public static HEAT_PORT_REMOTE = 'settings.heat_port_remote';
  public static HEAT_HOST_LOCAL = 'settings.heat_host_local';
  public static HEAT_PORT_LOCAL = 'settings.heat_port_local';
  public static HEATLEDGER_CERTIFIER_ACCOUNT = 'settings.heatledger_certifier_account';

  constructor() {
    this.settings[SettingsService.WEBSOCKET_URL] = 'wss://alpha.heatledger.com:8884/ws/';
    this.settings[SettingsService.WEBSOCKET_URL_FALLBACK] = [];
    this.settings[SettingsService.WEBSOCKET_URL_LOCALHOST] = 'ws://localhost:8884/ws/';
    this.settings[SettingsService.RS_ADDRESS_PREFIX] = 'HEAT';
    this.settings[SettingsService.ENGINE_TYPE] = 'heat';
    this.settings[SettingsService.BASE_FEE] = '0.1';

    /* @see http://blog.stevenlevithan.com/archives/date-time-format */
    this.settings[SettingsService.DATEFORMAT_DEFAULT] = 'yyyy-mm-dd HH:MM:ss';

    this.settings[SettingsService.APPLICATION_NAME] = 'HEAT';
    this.settings[SettingsService.APPLICATION_VERSION] = this.VERSION;
    this.settings[SettingsService.APPLICATION_BUILD] = this.BUILD;
    this.settings[SettingsService.SOCKET_RPC_TIMEOUT] = 30 * 1000;
    this.settings[SettingsService.SOCKET_RECONNECT_DELAY] = 2000;
    this.settings[SettingsService.LOG_API_ERRORS] = true;
    this.settings[SettingsService.LOG_API_ALL] = false;
    this.settings[SettingsService.LOG_NOTIFY_ALL] = false;

    this.settings[SettingsService.DICE_WORD_FOLDER] = "dice-words";
    this.settings[SettingsService.DICE_WORD_SUPPORTED_LANG] = {
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

    this.settings[SettingsService.HEAT_RPC_TIMEOUT] = 30 * 1000;
    this.settings[SettingsService.HEAT_WEBSOCKET_URL] = "";
    this.settings[SettingsService.LOG_HEAT_ERRORS] = true;
    this.settings[SettingsService.LOG_HEAT_ALL] = false;
    this.settings[SettingsService.LOG_HEAT_NOTIFY_ALL] = true;
    this.settings[SettingsService.HEAT_HOST_REMOTE] = "https://heatwallet.com"; // mainnet
    this.settings[SettingsService.HEAT_PORT_REMOTE] = "7734";
    this.settings[SettingsService.HEAT_HOST_LOCAL] = "http://localhost";
    this.settings[SettingsService.HEAT_PORT_LOCAL] = "7733";
    this.settings[SettingsService.HEATLEDGER_CERTIFIER_ACCOUNT] = '9583431768758058558';

    this.settings[SettingsService.TRANSACTION_PROCESSING_VISUALIZATION] = 111; /* Use 666 for longer visuals */
    this.settings[SettingsService.NEWS_URL] = "https://heatwallet.com/news.json";
    this.settings[SettingsService.CAPTCHA_SITE_KEY] = "6Le7pBITAAAAANPHWrIsoP_ZvlxWr0bSjOPrlszc";
    this.settings[SettingsService.CAPTCHA_POPUP] = "https://alpha.heatledger.com/captcha.html";

    /* Override with test endpoints */
    var TEST_HEAT_LEDGER = true;
    if (TEST_HEAT_LEDGER) {
      this.settings[SettingsService.HEAT_HOST_REMOTE] = "http://37.139.25.98"; // testnet
      this.settings[SettingsService.HEAT_PORT_REMOTE] = "7733"; // testnet
      this.settings[SettingsService.HEATLEDGER_CERTIFIER_ACCOUNT] = '4729421738299387565';
    }

    this.settings[SettingsService.HEAT_HOST] = this.settings[SettingsService.HEAT_HOST_REMOTE];
    this.settings[SettingsService.HEAT_PORT] = this.settings[SettingsService.HEAT_PORT_REMOTE];


  }

  settings={};

  public get(id:string) {
    return this.settings[id];
  }

  public put(id:string,value:string) {
    return this.settings[id]=value;
  }
}
