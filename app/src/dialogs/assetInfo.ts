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
module dialogs {
  export function assetInfo($event, info: AssetInfo) {
    let assetInfoService = <AssetInfoService> heat.$inject.get('assetInfo');
    let unsafeWarning = `This asset is operated by a third party.
Heat Ledger has no control over the asset and does not provide support for it.
It's possible the asset does NOT represent what you think it does.
Please ensure from asset issuer that the asset is valid before purchasing it, as there may be no refunds or redemptions available.
Asset purchases are non-refundable.`;



    assetInfoService.getAssetDescription(info).then((description)=>{
      dialogs.dialog({
        id: 'assetInfo',
        title: 'Asset Info',
        targetEvent: $event,
        cancelButton: false,
        locals: {
          description: description,
          info: info,
          unsafeWarning: unsafeWarning
        },
        template: `
          <div layout="column">
            <span ng-if="!vm.info.certified">{{vm.unsafeWarning}}<br><br></span>
            <span><b>{{vm.info.symbol}}</b> {{vm.info.name}}</span>
            <pre>{{vm.description}}</pre>
          </div>
        `
      })
    });
  }
}
