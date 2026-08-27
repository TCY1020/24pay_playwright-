import tools from '../tools.js'

const FORWARDED_MESSAGE_TYPE = 1

const stripAnsi = text => text.replace(/\x1B\[[0-9;]*m/g, '')

const formatThresholdWan = (amount) => {
  const numericAmount = Number(amount)
  if (Number.isFinite(numericAmount) && numericAmount % 10000 === 0) {
    return `${numericAmount / 10000}萬`
  }

  return tools.formatAmountWithCommas({ amount: numericAmount, maximumFractionDigits: 0 })
}

const formatBalanceAlertLineList = ({ alertList, comparisonText }) => {
  return alertList.map(item => {
    const formattedBalance = tools.formatAmountWithCommas({
      amount: item.balance,
      maximumFractionDigits: 0,
    })
    const formattedThreshold = formatThresholdWan(item.threshold)

    return `${item.label}總餘: ${formattedBalance} 已經${comparisonText}${formattedThreshold}，請注意`
  })
}

const formatSuccessNames = ({ itemList, withCardCount }) => {
  if (withCardCount) {
    return itemList
      .map(item => (
        item.cardCount != null
          ? `${item.name} (${item.cardCount}张)`
          : item.name
      ))
      .join(',\n')
  }

  return itemList.map(item => item.name).join(', ')
}

const messageFormat = {
  formatUpstreamBalanceReport({
    fastPayBalance,
    fastPayBlackBalance,
    tgPayBalance,
  }) {
    return `FastPay總餘: ${fastPayBalance}\nFastPay黑名單總餘: ${fastPayBlackBalance}\nTGPay總餘: ${tgPayBalance}`
  },

  formatJiliBalanceReport({ gotymeBalance = 'N/A' }) {
    return `\nGotyme總餘: ${gotymeBalance}`
  },

  formatLowBalanceAlert({ alertList = [], notifyUserText = '' }) {
    const lineList = formatBalanceAlertLineList({ alertList, comparisonText: '低於' })
    const body = lineList.join('\n')

    return notifyUserText ? `${notifyUserText}\n${body}` : body
  },

  formatHighBalanceAlert({ alertList = [], notifyUserText = '' }) {
    const lineList = formatBalanceAlertLineList({ alertList, comparisonText: '高於' })
    const body = lineList.join('\n')

    return notifyUserText ? `${notifyUserText}\n${body}` : body
  },

  buildRefreshReportText({ rowList }) {
    if (rowList.length === 0) {
      return '没有需要刷新的通道或商户名稱'
    }

    const configList = [
      {
        name: '通道',
        itemList: rowList.filter(item => !item.isMerchant),
      },
      {
        name: '商戶名稱',
        itemList: rowList.filter(item => item.isMerchant),
      },
    ]

    const hasFailed = rowList.some(item => item.message !== 'success')
    const messagePartList = []

    for (const { name, itemList } of configList) {
      if (itemList.length === 0) continue

      const successList = itemList.filter(item => item.message === 'success')
      const failedList = itemList.filter(item => item.message !== 'success')

      if (successList.length) {
        messagePartList.push(
          `刷新『成功』${name}:\n${formatSuccessNames({
            itemList: successList,
            withCardCount: !hasFailed,
          })}`,
        )
      }

      if (failedList.length) {
        const failedText = failedList
          .map(item => {
            const errorMsg = stripAnsi(String(item.message))

            return `${item.name}\n錯誤訊息:\n${errorMsg}`
          })
          .join('\n\n')

        messagePartList.push(`刷新『失敗』${name}:\n${failedText}`)
      }
    }

    messagePartList.push('>>> 皆已刷新完成')

    if (hasFailed) {
      messagePartList.push('>>> 失敗的部分請手動刷新')
    }

    return `\n${messagePartList.join('\n\n')}\n`
  },

  extract24payForwardMessage(payload) {
    const cleanedPayload = payload.replace(/\u001e/g, '')
    const messageObject = JSON.parse(cleanedPayload)

    if (messageObject.type !== FORWARDED_MESSAGE_TYPE) return null

    return messageObject.arguments?.[0] ?? null
  },

  format24payScheduledReport({
    todayPaymentOrderStatList,
    merchantPayTypePaymentList = [],
    notifyUserText = '',
  }) {
    const PAY_TYPE_LABEL_LIST = [
      { key: 'GoTyme', label: 'GoTyme扫码' },
      { key: 'MAYA_DIRECT', label: 'Maya直连' },
      { key: 'GCASH_QR', label: 'GCash扫码' },
    ]
    const DIVIDER = '——————————'

    const nowParts = tools.getUtc8Parts()
    const dateText = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`

    const summaryRow =
      todayPaymentOrderStatList.find(item => item.MerchantNo === '各商户汇总') ??
      todayPaymentOrderStatList[0]
    const totalPayAmount = Number(summaryRow?.OrderPayAmount ?? 0)
    const formattedTotalPayAmount = tools.formatAmountWithCommas({ amount: totalPayAmount, maximumFractionDigits: 0 })
    const topMerchantList = Array.isArray(summaryRow?.merchantList)
      ? summaryRow.merchantList.slice(0, 5)
      : []

    const topMerchantLineList = topMerchantList.map(merchant => {
      const successAmount = Number(merchant?.OrderSuccessAmount ?? 0)
      const formattedSuccessAmount = tools.formatAmountWithCommas({ amount: successAmount, maximumFractionDigits: 0 })
      const merchantName = String(merchant?.CompanyName ?? merchant?.MerchantNo ?? '').trim()

      return `${merchantName}: ${formattedSuccessAmount}`
    })

    const merchantDetailBlockList = merchantPayTypePaymentList.map(merchant => {
      const merchantName = String(merchant?.merchantName ?? merchant?.merchantNo ?? '').trim()
      const payTypeLineList = PAY_TYPE_LABEL_LIST.flatMap(({ key, label }) => {
        const amount = merchant?.[key] ?? '0.00'
        if (Number(amount) === 0) return []

        return [`${label} ${amount}`]
      })

      return [DIVIDER, merchantName, ...payTypeLineList].join('\n')
    })

    const titleLine = `${dateText}總跑量 ${formattedTotalPayAmount}`
    const notifyHeader = notifyUserText ? `${notifyUserText}\n${titleLine}` : titleLine

    return [
      notifyHeader,
      '前五家：',
      ...topMerchantLineList,
      '',
      ...merchantDetailBlockList,
    ].join('\n')
  },
}

export default messageFormat
