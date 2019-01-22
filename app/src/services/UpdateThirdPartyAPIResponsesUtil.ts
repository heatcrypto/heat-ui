
@Service('update3rdPartyAPIResponsesUtil')
class Update3rdPartyAPIResponsesUtil {

  public static updateBTCGetAddressInfo = (info, btcProvider): any => {
    if(btcProvider instanceof BtcBlockExplorer3rdPartyService) {
      /* As per blockcypher doc https://www.blockcypher.com/dev/bitcoin/#address
      final_n_tx represents total number of confirmed and unconfirmed transactions */
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
    return info
  }

  public static updateBTCGetTxInfo = (info, btcProvider): any => {
    if(btcProvider instanceof BtcBlockExplorer3rdPartyService) {
      info.blockheight = info.block_height
      return info;
    }
    return info
  }
}