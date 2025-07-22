namespace wlt {

    export class WalletFilter {

        constructor(query: string) {
            this.queryTokens = utils.tokenize(query.toUpperCase())
            this.queryTokensUpperCase = this.queryTokens.map(s => s.toUpperCase())
        }

        public queryTokens: string[]
        public queryTokensUpperCase: string[]

        test(str: string, exact = false) {
            return this.queryTokens.find(s => exact ? str == s : str.indexOf(s) > -1)
        }

        /*test(str: string, exact = false, matchCase = false) {
            return matchCase
                ? this.queryTokens.find(s => exact ? str == s : str.indexOf(s) > -1)
                : this.queryTokensUpperCase.find(s => exact ? str.toUpperCase() == s : str.toUpperCase().indexOf(s) > -1)
        }*/

    }

}