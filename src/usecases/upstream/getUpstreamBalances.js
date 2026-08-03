import sing from '../../../sing.js'
import upstreamApi from '../../../upstreamApi.js'

const getUpstreamBalances = async ({ config }) => {
  const fastPaySign = sing.fastPay({
    params: { merchantNo: config.FASTPAY.MERCHANT_NO },
    key: config.FASTPAY.KEY,
  })
  const fastPayBalanceData = await upstreamApi.getFastPayBalance({
    params: { sign: fastPaySign, merchantNo: config.FASTPAY.MERCHANT_NO },
    domain: config.FASTPAY.DOMAIN,
  })

  const fastPayBlackSign = sing.fastPay({
    params: { merchantNo: config.FASTPAY_BLACK.MERCHANT_NO },
    key: config.FASTPAY_BLACK.KEY,
  })
  const fastPayBlackBalanceData = await upstreamApi.getFastPayBalance({
    params: { sign: fastPayBlackSign, merchantNo: config.FASTPAY_BLACK.MERCHANT_NO },
    domain: config.FASTPAY_BLACK.DOMAIN,
  })

  const tgPayBalanceData = await upstreamApi.getTgPayBalance({
    params: { parter: config.TGPAY.PARTNER },
    domain: config.TGPAY.DOMAIN,
  })

  const leePayBalanceData = await upstreamApi.getLeePayBalance({
    token: config.LEEPAY.TOKEN,
    domain: config.LEEPAY.DOMAIN,
  })

  return {
    fastPayBalanceData,
    fastPayBlackBalanceData,
    tgPayBalanceData,
    leePayBalanceData,
  }
}

export default getUpstreamBalances
