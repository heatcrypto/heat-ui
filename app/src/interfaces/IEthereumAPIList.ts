interface IEthereumAPIList {
  tokenInfoCache: { [key: string]: EthplorerTokenInfo };

  getAddressTransactions(address: string, pageNum?: number)

  getTxInfo(txId: string): PromiseLike<any>

  getBalance(address: string): PromiseLike<string>

  broadcast(rawTx: string)

  getTransactionCount(address: string): PromiseLike<number>

  getAddressInfoUrl(address: string): string

  getAddressInfo(address: string, useCache: boolean): PromiseLike<any>

  getProviderName(): string

}

interface EthplorerTokenInfo {
  address: string;
  totalSupply: string;
  name: string;
  symbol: string;
  decimals: number;
  // token price (false, if not available)
  price: {
    rate: string;
    currency: string;
    diff: number;
    ts: number;
  };
  owner: string;
  countOps: string;
  totalIn: number;
  totalOut: number;
  holdersCount: number;
  issuancesCount: number;
}

interface EthplorerAddressInfo {
  address: string;
  ETH: {
    balance: string;
    totalIn: string;
    totalOut: string;
  };
  // exists if specified address is a contract
  contractInfo: {
    creatorAddress: string;
    transactionHash: string;
    timestamp: number;
  };
  // exists if specified address is a token contract address (same format as token info),
  tokenInfo: EthplorerTokenInfo;
  // exists if specified address has any token balances
  tokens: Array<{
    tokenInfo: EthplorerTokenInfo;
    // token balance (as is, not reduced to a floating point value)
    balance: string;
    totalIn: string;
    totalOut: string;
  }>;
  // Total count of incoming and outcoming transactions (including creation one)
  countTxs: number;
}

/* These are all address transactions including 0x txns  */
interface EthplorerAddressTransaction {
  // operation timestamp
  timestamp: number
  // source address (if two addresses involved)
  from: string
  // destination address (if two addresses involved)
  to: string
  // transaction hash
  hash: string
  // ETH value (as is, not reduced to a floating point value)
  value: string
  // input data
  input: string
  // true if transactions was completed, false if failed
  success: boolean
}

/* These are all address operations, these contain parsed input data turned into operations */
interface EthplorerAddressHistoryOperation {
  // operation timestamp
  timestamp: number
  transactionHash: string;
  // token data (same format as token info)
  tokenInfo: EthplorerTokenInfo
  // operation type (transfer, approve, issuance, mint, burn, etc)
  type: string
  // operation target address (if one)
  address: string
  // source address (if two addresses involved),
  from: string
  // destination address (if two addresses involved),
  to: string
  // operation value (as is, not reduced to a floating point value),
  value: string
}

interface EthplorerTxInfo {
  // transaction hash
  hash: string
  // transaction block time
  timestamp: number
  // transaction block number
  blockNumber: number
  // number of confirmations
  confirmations: number
  // true if there were no errors during tx execution
  success: boolean
  // source address
  from: string
  // destination address
  to: string
  // ETH send value
  value: string
  // transaction input data (hex)
  input: string
  // gas limit set to this transaction
  gasLimit: string
  // gas used for this transaction
  gasUsed: string
}