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
enum EngineType {
    HEAT,
    FIMK,
    NXT
}

@Service('engine')
@Inject('sockets','settings')
class EngineService {

  constructor(private sockets: SocketsService,
              private settings: SettingsService) {}

  private _socket: ISocket;
  private _localSocket: ISocket;
  public type: EngineType = this.determineEngineType();

  socket(): ISocket {
    if (!this._socket) {
      this._socket = this.sockets.getSocket();
      this._socket.connect(
        this.settings.get(SettingsService.WEBSOCKET_URL),
        this.settings.get(SettingsService.WEBSOCKET_URL_FALLBACK)
      );
    }
    return this._socket;
  }

  localSocket(): ISocket {
    if (!this._localSocket) {
      this._localSocket = this.sockets.getSocket('local');
      this._localSocket.connect(
        this.settings.get(SettingsService.WEBSOCKET_URL_LOCALHOST)
      );
    }
    return this._localSocket;
  }

  determineEngineType() {
    var type = this.settings.get(SettingsService.ENGINE_TYPE);
    switch (type) {
      case 'heat': return EngineType.HEAT;
      case 'fimk': return EngineType.FIMK;
      case 'nxt': return EngineType.NXT;
      default:
        throw new Error('Not a supported engined type '+type);
    }
  }

  getBaseFeeNQT(): string {
    return utils.convertToNQT(this.settings.get(SettingsService.BASE_FEE));
  }
}