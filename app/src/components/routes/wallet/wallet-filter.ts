namespace wlt {

    export class WalletFilter {

        private static FUZZY_PREFIX = '~'
        //static wordRegex = /"[^"]*"|\w+/g  //special symbols are separators also   'This4!-rr' => 'This4', 'rr'
        static wordRegex = /"[^"]*"|\S+/g  // 'This4!-rr' => 'This4!-rr'

        constructor(query: string) {
            this.queryTokens = this.tokenize(query)
            // remove quotes
            this.queryTokens = this.queryTokens.map(s => s.replace(/"/gi, ''))
            this.queryTokensUpperCase = this.queryTokens.map(s => s.toUpperCase())
            this.fuzzyTokens = this.queryTokens.filter(s => s.startsWith(WalletFilter.FUZZY_PREFIX))
            if (this.fuzzyTokens.length > 0) {
                this.queryTokensUpperCase = this.queryTokensUpperCase.filter(s => !s.startsWith(WalletFilter.FUZZY_PREFIX))
            }
        }

        public queryTokens: string[]
        public queryTokensUpperCase: string[]
        public fuzzyTokens: string[]

        tokenize(input) {
            return input.match(WalletFilter.wordRegex)
        }

        test(str: string, exact = false): {token: string, item: string} {
            let upCaseToken = this.queryTokensUpperCase.find(s => exact ? str == s : str?.toUpperCase().indexOf(s) > -1)
            if (upCaseToken)  return {token: this.queryTokens.find(v => v.toUpperCase() == upCaseToken), item: str}
            if (this.fuzzyTokens.length > 0) {
                for (let fuzzyToken of this.fuzzyTokens) {
                    let t = fuzzyToken.substring(1)  //without prefix "~"
                    if (str.length > t.length) {
                        let pos = 0
                        while (pos + t.length < str.length) {
                            let chunk = str.substring(pos, pos + t.length)
                            if (utils.stringSimilarity(chunk, t) > 0.51)  return {token: fuzzyToken, item: `${str} [${chunk}]`}
                            pos++
                        }
                    } else {
                        if (utils.stringSimilarity(str, t) > 0.51)  return {token: WalletFilter.FUZZY_PREFIX + t, item: str}
                    }
                }
            }
        }

        /*test(str: string, exact = false, matchCase = false) {
            return matchCase
                ? this.queryTokens.find(s => exact ? str == s : str.indexOf(s) > -1)
                : this.queryTokensUpperCase.find(s => exact ? str.toUpperCase() == s : str.toUpperCase().indexOf(s) > -1)
        }*/

    }

}