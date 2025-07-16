namespace wlt {

    export class WalletFilter {
        public currencies: {symbol?: string, name?: string}[]
        public addresses: string[]
        public tmp: string
    }

}