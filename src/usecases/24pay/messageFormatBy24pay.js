import tools from '../../../tools.js'

const FORWARDED_MESSAGE_TYPE = 1

const messageFormatBy24pay = {
  extract24payForwardMessage(payload) {
    const cleanedPayload = payload.replace(/\u001e/g, '')
    const messageObject = JSON.parse(cleanedPayload)

    if (messageObject.type !== FORWARDED_MESSAGE_TYPE) return null

    return messageObject.arguments?.[0] ?? null
  },

  format24payScheduledReport({ todayPaymentOrderStats, notifyUserText = '' }) {
    const nowParts = tools.getUtc8Parts()
    const dateText = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`

    const summaryRow =
      todayPaymentOrderStats.find(item => item.MerchantNo === '各商户汇总') ??
      todayPaymentOrderStats[0]
    const totalPayAmount = Number(summaryRow?.OrderPayAmount ?? 0)
    const formattedTotalPayAmount = Number.isFinite(totalPayAmount) ? totalPayAmount.toFixed(2) : '0.00'
    const topMerchantList = Array.isArray(summaryRow?.merchantList)
      ? summaryRow.merchantList.slice(0, 5)
      : []

    const topMerchantLines = topMerchantList.map(merchant => {
      const successAmount = Number(merchant?.OrderSuccessAmount ?? 0)
      const formattedSuccessAmount = Number.isFinite(successAmount) ? successAmount.toFixed(2) : '0.00'
      const merchantNo = String(merchant?.MerchantNo ?? '').trim()

      return `${merchantNo}: ${formattedSuccessAmount}`
    })

    const titleLine = `${dateText}總跑量 ${formattedTotalPayAmount}`
    const notifyHeader = notifyUserText ? `${notifyUserText}\n${titleLine}` : titleLine

    return [
      notifyHeader,
      '前五家：',
      ...topMerchantLines,
    ].join('\n')
  },
}

export default messageFormatBy24pay
