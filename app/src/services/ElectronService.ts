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

/* https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentsopendevtoolsoptions */
enum OpenDevToolsMode {
  "right",
  "bottom",
  "undocked",
  "detach"
}

@Service('electron')
@Inject('env')
class ElectronService {

  private enabled: boolean = false;

  /* @see https://github.com/electron/electron/blob/master/docs/api/web-contents.md */
  constructor(env: EnvService) {
    this.enabled = env.type == EnvType.NODEJS;
  }

  /* Return the first instance since the second one is the dev-tools window,
     when we start using multi-window ui this needs a look. */
  // TODO
  private getMainWindowWebContents() {
    try {
      return require('electron').remote.webContents.getAllWebContents()[0];
    } catch (e) {
      if (this.enabled)
        throw e;
      console.log("Do not access the `electron` service in browser env", e);
    }
  }

  openDevTools(option: OpenDevToolsMode) {
    this.enabled && this.getMainWindowWebContents().openDevTools({mode:option});
  }

  toggleDevTools() {
    this.enabled && this.getMainWindowWebContents().toggleDevTools();
  }

  isDevToolsOpened() {
    return this.enabled && this.getMainWindowWebContents().isDevToolsOpened();
  }

  reload() {
    this.enabled && this.getMainWindowWebContents().reload();
  }
}