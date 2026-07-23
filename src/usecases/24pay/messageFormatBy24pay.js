import tools from '../../../tools.js'

const FORWARDED_MESSAGE_TYPE = 1

const messageFormatBy24pay = {
  extract24payForwardMessage(payload) {
    const cleanedPayload = payload.replace(/\u001e/g, '')
    const messageObject = JSON.parse(cleanedPayload)

    if (messageObject.type !== FORWARDED_MESSAGE_TYPE) return null

    return messageObject.arguments?.[0] ?? null
  },

  format24payScheduledReport({
    todayPaymentOrderStats,
    merchantPayTypePaymentList = [],
    notifyUserText = '',
  }) {
    const PAY_TYPE_LABELS = [
      { key: 'GoTyme', label: 'GoTyme扫码' },
      { key: 'MAYA_DIRECT', label: 'Maya直连' },
      { key: 'GCASH_QR', label: 'GCash扫码' },
    ]
    const DIVIDER = '——————————'

    const nowParts = tools.getUtc8Parts()
    const dateText = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`

    const summaryRow =
      todayPaymentOrderStats.find(item => item.MerchantNo === '各商户汇总') ??
      todayPaymentOrderStats[0]
    const totalPayAmount = Number(summaryRow?.OrderPayAmount ?? 0)
    const formattedTotalPayAmount = tools.formatAmountWithCommas(totalPayAmount)
    const topMerchantList = Array.isArray(summaryRow?.merchantList)
      ? summaryRow.merchantList.slice(0, 5)
      : []

    const topMerchantLines = topMerchantList.map(merchant => {
      const successAmount = Number(merchant?.OrderSuccessAmount ?? 0)
      const formattedSuccessAmount = tools.formatAmountWithCommas(successAmount)
      const merchantName = String(merchant?.CompanyName ?? merchant?.MerchantNo ?? '').trim()

      return `${merchantName}: ${formattedSuccessAmount}`
    })

    const merchantDetailBlocks = merchantPayTypePaymentList.map(merchant => {
      const merchantName = String(merchant?.merchantName ?? merchant?.merchantNo ?? '').trim()
      const payTypeLines = PAY_TYPE_LABELS.flatMap(({ key, label }) => {
        const amount = merchant?.[key] ?? '0.00'
        if (Number(amount) === 0) return []

        return [`${label} ${amount}`]
      })

      return [DIVIDER, merchantName, ...payTypeLines].join('\n')
    })

    const titleLine = `${dateText}總跑量 ${formattedTotalPayAmount}`
    const notifyHeader = notifyUserText ? `${notifyUserText}\n${titleLine}` : titleLine

    return [
      notifyHeader,
      '前五家：',
      ...topMerchantLines,
      '',
      ...merchantDetailBlocks,
    ].join('\n')
  },
}

export default messageFormatBy24pay
