namespace wlt {

    export class WalletFilter {

        //static wordRegex = /"[^"]*"|\w+/g  //special symbols are separators also   'This4!-rr' => 'This4', 'rr'
        static wordRegex = /"[^"]*"|\S+/g  // 'This4!-rr' => 'This4!-rr'

        constructor(query: string) {
            this.queryTokens = this.tokenize(query)
            // remove quotes
            this.queryTokens = this.queryTokens.map(s => s.replace(/"/gi, ''))
            this.queryTokensUpperCase = this.queryTokens.map(s => s.toUpperCase())
        }

        public queryTokens: string[]
        public queryTokensUpperCase: string[]

        tokenize(input) {
            return input.match(WalletFilter.wordRegex)
        }

        test(str: string, exact = false): {token: string, item: string} {
            let tokenIndex = this.queryTokensUpperCase.findIndex(s => exact ? str == s : str?.toUpperCase().indexOf(s) > -1)
            if (tokenIndex > -1)  return {token: this.queryTokens[tokenIndex], item: str}
        }

        /*test(str: string, exact = false, matchCase = false) {
            return matchCase
                ? this.queryTokens.find(s => exact ? str == s : str.indexOf(s) > -1)
                : this.queryTokensUpperCase.find(s => exact ? str.toUpperCase() == s : str.toUpperCase().indexOf(s) > -1)
        }*/

    }

}