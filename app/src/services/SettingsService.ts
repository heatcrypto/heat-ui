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

  public static WEBSOCKET_URL = 'settings.websocket_url';
  public static WEBSOCKET_URL_FALLBACK = 'settings.websocket_url_fallback';
  public static WEBSOCKET_URL_LOCALHOST = 'settings.websocket_url_localhost';
  public static RS_ADDRESS_PREFIX = 'settings.rs_address_prefix';
  public static ENGINE_TYPE = 'settings.engine_type';
  public static BASE_FEE = 'settings.base_fee';
  public static DATEFORMAT_DEFAULT = 'settings.dateformat_default';
  public static APPLICATION_NAME = 'settings.application_name';
  public static APPLICATION_VERSION = 'settings.application_version';
  public static SOCKET_RPC_TIMEOUT = 'settings.socket_rpc_timeout';
  public static SOCKET_RECONNECT_DELAY = 'settings.socket_reconnect_delay';
  public static LOG_API_ERRORS = 'settings.log_api_errors';
  public static LOG_API_ALL = 'settings.log_api_all';
  public static LOG_NOTIFY_ALL = 'settings.log_notify_all';
  public static CLOUD_URL = 'settings.cloud_url';
  public static LOG_CLOUD_ERRORS = 'settings.log_cloud_errors';
  public static LOG_CLOUD_ALL = 'settings.log_cloud_all';
  public static LOG_CLOUD_NOTIFY_ALL = 'settings.log_cloud_notify_all';
  public static DICE_WORD_FOLDER = 'settings.dice_word_folder';
  public static DICE_WORD_SUPPORTED_LANG = 'settings.dice_word_supported_lang';
  public static CLOUD_RPC_TIMEOUT = 'settings.cloud_rpc_timeout';
  public static CLOUD_WEBSOCKET_URL = 'settings.cloud_websocket_url';
  public static TRANSACTION_PROCESSING_VISUALIZATION = 'settings.transaction_processing_visualization';

  constructor() {
    this.settings[SettingsService.WEBSOCKET_URL] = 'wss://zombies.mofowallet.org:8884/ws/';
    this.settings[SettingsService.WEBSOCKET_URL_FALLBACK] = [];
    this.settings[SettingsService.WEBSOCKET_URL_LOCALHOST] = 'ws://localhost:8884/ws/';
    this.settings[SettingsService.RS_ADDRESS_PREFIX] = 'HEAT';
    this.settings[SettingsService.ENGINE_TYPE] = 'heat';
    this.settings[SettingsService.BASE_FEE] = '0.001';

    /* @see http://blog.stevenlevithan.com/archives/date-time-format */
    this.settings[SettingsService.DATEFORMAT_DEFAULT] = 'yyyy-mm-dd HH:MM:ss';

    this.settings[SettingsService.APPLICATION_NAME] = 'Heat';
    this.settings[SettingsService.APPLICATION_VERSION] = 'v0.0.1e';
    this.settings[SettingsService.SOCKET_RPC_TIMEOUT] = 30 * 1000;
    this.settings[SettingsService.SOCKET_RECONNECT_DELAY] = 2000;
    this.settings[SettingsService.LOG_API_ERRORS] = true;
    this.settings[SettingsService.LOG_API_ALL] = false;
    this.settings[SettingsService.LOG_NOTIFY_ALL] = false;
    this.settings[SettingsService.CLOUD_URL] = "http://alpha.heatledger.com:8080";
    this.settings[SettingsService.LOG_CLOUD_ERRORS] = true;
    this.settings[SettingsService.LOG_CLOUD_ALL] = true;
    this.settings[SettingsService.LOG_CLOUD_NOTIFY_ALL] = true;

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

    this.settings[SettingsService.CLOUD_RPC_TIMEOUT] = 30 * 1000;
    this.settings[SettingsService.CLOUD_WEBSOCKET_URL] = "ws://zombies.mofowallet.org:8080/socket";
    this.settings[SettingsService.TRANSACTION_PROCESSING_VISUALIZATION] = 111; /* Use 666 for longer visuals */

    /* Override with test endpoints */
    var LOCAL_TEST = false;
    if (LOCAL_TEST) {
      this.settings[SettingsService.WEBSOCKET_URL] = 'ws://localhost:8884/ws/'; // TEST NET FIMK
      this.settings[SettingsService.CLOUD_URL] = "http://localhost:9000";
      this.settings[SettingsService.CLOUD_WEBSOCKET_URL] = "ws://localhost:9000/socket";
    }
  }

  settings={};

  public get(id:string) {
    return this.settings[id];
  }
}
