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
interface IHeatWalletFile {
  version: number;
  entries: Array<IHeatWalletFileEntry>;
}

interface IHeatWalletFileEntry {
  /* Decrypt with LocalKeyStoreService.decode() requires pin code gives ILocalKey */
  contents: string;

  /* Numeric account id, also contained in encrypted contents */
  account?: string;

  /* Optional name, also contained in encrypted contents */
  name?: string;

  /* Optional if this is a testnet key */
  isTestnet?: boolean;
}

@Service('walletFile')
class WalletFileService {

  createFromText(contents: string): IHeatWalletFile {
    return this.decode(contents);
  }

  encode(walletFile: IHeatWalletFile): string {
    return JSON.stringify(walletFile, null, 2);
  }

  decode(contents: string): IHeatWalletFile {
    let data = this.parseJSON(contents);
    if (!data)
      return null;

    let version = data.version;
    if (!angular.isNumber(version))
      return null;

    if (version != 1)
      return null;

    let entries = data.entries;
    if (!angular.isArray(entries))
      return null;

    let walletFile: IHeatWalletFile = {
      version: version,
      entries: []
    };
    entries.forEach(entry => {
      if (angular.isString(entry.contents)) {
        walletFile.entries.push(entry);
      }
    });
    return walletFile;
  }

  parseJSON(contents: string): any {
    try {
      let json = JSON.parse(contents);
      if (angular.isObject(json))
        return json
    } catch (e) {
      console.log('Could not parse wallet file', e);
    }
  }
}

