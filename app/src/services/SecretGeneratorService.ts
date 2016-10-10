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
interface IDicewordLanguage {
  code: string;
  words: Array<string>;
  file: string;
  fileHash: string;
}

@Service('secretGenerator')
@Inject('$q','settings','env','$http')
class SecretGeneratorService {

  private languages: Array<IDicewordLanguage> = [];

  public langCodes: Array<string> = [];

  constructor(private $q: angular.IQService,
              private settings: SettingsService,
              private env: EnvService,
              private $http: angular.IHttpService) {

    var folder = settings.get(SettingsService.DICE_WORD_FOLDER);

    /* Dice word language entries are of form:
       [LANG_CODE]: ARRAY[FILENAME, EXPECTED FILE HASH] */
    angular.forEach(settings.get(SettingsService.DICE_WORD_SUPPORTED_LANG), (val, key) => {
      this.languages.push({
        code: key,
        words: [],
        file: folder+'/'+val[0],
        fileHash: val[1]
      });
      this.langCodes.push(key);
    });
  }

  public generate(langCode: string): angular.IPromise<string> {
    var deferred = this.$q.defer();
    this.getWordlist(langCode).then((wordList) => {
      deferred.resolve(this.generateSecret(wordList));

    }, deferred.reject);
    return deferred.promise;
  }

  public generateBulk(langCode: string, count: number): angular.IPromise<Array<string>> {
    var deferred = this.$q.defer();
    this.getWordlist(langCode).then((wordList) => {
      var bulk: Array<string> = [];
      for (var i=0; i<count; i++) {
        bulk.push(this.generateSecret(wordList));
      }
      deferred.resolve(bulk);
    }, deferred.reject);
    return deferred.promise;
  }

  private generateSecret(wordList: string[]) : string {
      var words = [];
    var crypto = window.crypto || window['msCrypto'];
    var random = new Uint32Array(128 / 32);
    crypto.getRandomValues(random);

    var x, w1, w2, w3, n=wordList.length;
    for (var i=0; i<random.length; i++) {
      x = random[i];
      w1 = x % n;
      w2 = (((x / n) >> 0) + w1) % n;
      w3 = (((((x / n) >> 0) / n) >> 0) + w2) % n;

      words.push(wordList[w1]);
      words.push(wordList[w2]);
      words.push(wordList[w3]);
    }
    crypto.getRandomValues(random);

    // only if using a word list of 7776 words or longer can we use 10 words,
    // otherwise use 12 words
    if (wordList.length >= 7776) {
      words = words.slice(0, 10);
    }

    return words.join(" ");
  }

  private getWordlist(langCode: string): angular.IPromise<Array<string>> {
    var deferred = this.$q.defer();
    var lang: IDicewordLanguage = this.languages.find((lang) => lang.code == langCode);
    if (lang.words.length > 0) {
      deferred.resolve(lang.words);
    }
    else {
      this.downloadWordlist(lang.file, lang.fileHash).then(
        (words) => {
          lang.words = words;
          deferred.resolve(words);
        },
        deferred.reject
      );
    }
    return deferred.promise;
  }

  private downloadWordlist(file: string, fileHash: string): angular.IPromise<Array<string>> {
    var deferred = this.$q.defer();
    this.$http({
      url: this.resolveURL(file),
      method: 'GET'
    }).success((data: string) => {

      /* Make sure the file contents match the expected hash */
      var hash = heat.crypto.calculateStringHash(data);
      if (hash != fileHash) {
        console.error(`File hashes don't match.\nFile: ${file}\nGot hash: ${hash}\nExpected: ${fileHash}`);
        deferred.reject();
        return;
      }

      var words = data.match(/[^\r\n]+/g);

      /* Ensure word lists always have > 1625 words */
      if (words.length < 1625) {
        console.error(`Word list too short.\nFile: ${file}\nGot ${words.length} words\nRequired are at least 1625 words`);
        deferred.reject();
        return;
      }

      /* One extra check to ensure no duplicates exist in word list */
      if (this.hasDuplicates(words)) {
        console.error(`Word lists can't contain duplicates.\nFile: ${file}`);
        deferred.reject();
        return;
      }

      deferred.resolve(words);
    }).error(deferred.reject);
    return deferred.promise;
  }

  private resolveURL(file: string) {
    return (this.env.type == EnvType.NODEJS) ?
      file : window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + window.location.pathname + file;
  }

  private hasDuplicates(array: Array<string>): boolean {
    var duplicates = {}, key;
    for (var i=0; i<array.length; i++) {
      key = array[i];
      if (duplicates.hasOwnProperty(key)) {
        console.error(`Duplicate word found "${key}"`);
        return true;
      }
      duplicates[key] = 1;
    }
    return false;
  }
}