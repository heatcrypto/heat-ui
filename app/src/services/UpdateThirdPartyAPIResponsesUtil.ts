interface UpdateBTCGetAddressInfoResponse {
  address: string
  txApperances: number
  transactions: string[]
  balanceSat: number
  unconfirmedBalanceSat: number
}


@Service('update3rdPartyAPIResponsesUtil')
class Update3rdPartyAPIResponsesUtil {

  public static updateBTCGetAddressInfo = (info, btcProvider): UpdateBTCGetAddressInfoResponse => {
    /*if(btcProvider instanceof BtcBlockExplorer3rdPartyService) {
      // As per blockcypher doc https://www.blockcypher.com/dev/bitcoin/#address
      //final_n_tx represents total number of confirmed and unconfirmed transactions
      let transactions = new Set();
      if(info.txrefs){
        info.txrefs.forEach(txref => {
          transactions.add(txref.tx_hash)
        });
      }
      info.transactions = Array.from(transactions)
      info.txApperances = info.final_n_tx;
      info.balanceSat = info.final_balance
      return info;
    }
    else */if (btcProvider instanceof BtcBlockExplorerBlockbookService) {
      let transactions = new Set();
      if(info.txids){
        info.txids.forEach(txid => {
          transactions.add(txid)
        });
      }
      info.transactions = Array.from(transactions)
      info.txApperances = info.txs;
      info.balanceSat = parseInt(info.balance)
      info.unconfirmedBalance = parseInt(info.unconfirmedBalance)
      return info;
    }
    return info
  }

  public static updateBTCGetTxInfo = (info, btcProvider): any => {
    /*if(btcProvider instanceof BtcBlockExplorer3rdPartyService) {
      info.blockheight = info.block_height
      return info;
    }
    else */if(btcProvider instanceof BtcBlockExplorerBlockbookService) {
      info.blockheight = info.blockHeight
      return info;
    }
    return info
  }

  public static updateBTCGetTransactions = (info, btcProvider): any => {
    if (btcProvider instanceof BtcBlockExplorerBlockbookService) {
      if (Array.isArray(info)) {
        return info.map(blockbookTxn => {
          const vin =  (blockbookTxn.vin||[]).map(input => {
            return {
              addr: (input.addresses||[])[0]||"",
              value: utils.formatQNT(input.value)
            }
          })
          const vout = (blockbookTxn.vout||[]).map(output => {
            return {
              scriptPubKey: {
                addresses: output.addresses
              },
              value: utils.formatQNT(output.value)
            }
          })
          const insightTxn = {
            blockhash: blockbookTxn.blockHash,
            blockheight: blockbookTxn.blockHeight,
            blocktime: blockbookTxn.blockTime,
            confirmations: blockbookTxn.confirmations,
            fees: blockbookTxn.fees,
            hex: blockbookTxn.hex,
            time: blockbookTxn.blockTime,
            txid: blockbookTxn.txid,
            valueIn: utils.formatQNT(blockbookTxn.valueIn),
            value: utils.formatQNT(blockbookTxn.value),
            version: 1,
            vin: vin,
            vout: vout
          }
          return insightTxn;
        })
      }
    }
    return info
  }
}