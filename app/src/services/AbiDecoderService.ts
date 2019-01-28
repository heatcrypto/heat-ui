/*
 * The MIT License (MIT)
 * Copyright (c) 2018 Heat Ledger Ltd.
 *
 * Inspired by: https://github.com/ConsenSys/abi-decoder
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
@Service('abiDecoder')
@Inject('web3', '$window')
class AbiDecoderService {

  private SolidityCoder: any
  private Web3: any
  private state = {
    savedABIs: [],
    methodIDs: {}
  }

  constructor(private web3: Web3Service,
              private $window: angular.IWindowService) {
    this.Web3 = $window.heatlibs.Web3
    this.SolidityCoder = $window.heatlibs.__SolidityCoder
  }

  public getABIs() {
    return this.state.savedABIs;
  }

  public addABI(abiArray) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id's
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = new (this.Web3)().sha3(abi.name + "(" + abi.inputs.map(function (input) { return input.type; }).join(",") + ")");
          //const signature = this.web3.web3.sha3(abi.name + "(" + abi.inputs.map(function(input) {return input.type;}).join(",") + ")");
          if (abi.type == "event") {
            this.state.methodIDs[signature.slice(2)] = abi;
          }
          else {
            this.state.methodIDs[signature.slice(2, 10)] = abi;
          }
        }
      });
      this.state.savedABIs = this.state.savedABIs.concat(abiArray);
    }
    else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  public removeABI(abiArray) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id's
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = new (this.Web3)().sha3(abi.name + "(" + abi.inputs.map(function (input) { return input.type; }).join(",") + ")");
          //const signature = this.web3.web3.sha3(abi.name + "(" + abi.inputs.map(function(input) {return input.type;}).join(",") + ")");
          if (abi.type == "event") {
            if (this.state.methodIDs[signature.slice(2)]) {
              delete this.state.methodIDs[signature.slice(2)];
            }
          }
          else {
            if (this.state.methodIDs[signature.slice(2, 10)]) {
              delete this.state.methodIDs[signature.slice(2, 10)];
            }
          }
        }
      });
    }
    else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  public getMethodIDs() {
    return this.state.methodIDs;
  }

  public decodeMethod(data) {
    const methodID = data.slice(2, 10);
    const abiItem = this.state.methodIDs[methodID];
    if (abiItem) {
      const params = abiItem.inputs.map(function (item) { return item.type; });
      let decoded = this.SolidityCoder.decodeParams(params, data.slice(10));
      //let decoded = this.web3.web3.eth.abi.decodeParameters(params, data.slice(10));
      return {
        name: abiItem.name,
        params: decoded.map(function (param, index) {
          let parsedParam = param;
          const isUint = abiItem.inputs[index].type.indexOf("uint") == 0;
          const isInt = abiItem.inputs[index].type.indexOf("int") == 0;

          if (isUint || isInt) {
            const isArray = Array.isArray(param);

            if (isArray) {
              parsedParam = param.map(val => new (this.Web3)().toBigNumber(val).toString());
            } else {
              parsedParam = new (this.Web3)().toBigNumber(param).toString();
            }
          }
          return {
            name: abiItem.inputs[index].name,
            value: parsedParam,
            type: abiItem.inputs[index].type
          };
        })
      }
    }
  }

  public padZeros(address) {
    var formatted = address;
    if (address.indexOf('0x') != -1) {
      formatted = address.slice(2);
    }

    if (formatted.length < 40) {
      while (formatted.length < 40) formatted = "0" + formatted;
    }

    return "0x" + formatted;
  }

  // decodeLogs(logs) {
  //   return logs.map((logItem) => {
  //     const methodID = logItem.topics[0].slice(2);
  //     const method = this.state.methodIDs[methodID];
  //     if (method) {
  //       const logData = logItem.data;
  //       let decodedParams = [];
  //       let dataIndex = 0;
  //       let topicsIndex = 1;

  //       let dataTypes = [];
  //       method.inputs.map(
  //         function (input) {
  //           if (!input.indexed) {
  //             dataTypes.push(input.type);
  //           }
  //         }
  //       );
  //       const decodedData = this.SolidityCoder.decodeParams(dataTypes, logData.slice(2));
  //       // Loop topic and data to get the params
  //       method.inputs.map((param) => {
  //         var decodedP:any = {
  //           name: param.name,
  //           type: param.type
  //         };

  //         if (param.indexed) {
  //           decodedP.value = logItem.topics[topicsIndex];
  //           topicsIndex++;
  //         }
  //         else {
  //           decodedP.value = decodedData[dataIndex];
  //           dataIndex++;
  //         }

  //         if (param.type == "address"){
  //           decodedP.value = this.padZeros(new (this.Web3)().toBigNumber(decodedP.value).toString(16));
  //         }
  //         else if(param.type == "uint256" || param.type == "uint8" || param.type == "int" ){
  //           decodedP.value = new (this.Web3)().toBigNumber(decodedP.value).toString(10);
  //         }

  //         decodedParams.push(decodedP);
  //       });
  //       return {
  //         name: method.name,
  //         events: decodedParams,
  //         address: logItem.address
  //       };
  //     }
  //   });
  // }
}