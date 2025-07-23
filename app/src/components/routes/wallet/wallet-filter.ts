namespace wlt {

    export class WalletFilter {

        //finds: Map<string, string[]> // token => found item

        constructor(query: string) {
            this.queryTokens = utils.tokenize(query)
            this.queryTokensUpperCase = this.queryTokens.map(s => s.toUpperCase())
        }

        public queryTokens: string[]
        public queryTokensUpperCase: string[]

        test(str: string, exact = false): {token: string, item: string} {
            let r = this.queryTokensUpperCase.find(s => exact ? str == s : str?.toUpperCase().indexOf(s) > -1)
            if (r)  return {token: r, item: str}
        }

        /*test(str: string, exact = false, matchCase = false) {
            return matchCase
                ? this.queryTokens.find(s => exact ? str == s : str.indexOf(s) > -1)
                : this.queryTokensUpperCase.find(s => exact ? str.toUpperCase() == s : str.toUpperCase().indexOf(s) > -1)
        }*/

    }

}