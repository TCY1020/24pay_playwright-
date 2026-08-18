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

const formatBalanceAlertLines = ({ alerts, comparisonText }) => {
  return alerts.map(item => {
    const formattedBalance = tools.formatAmountWithCommas({
      amount: item.balance,
      maximumFractionDigits: 0,
    })
    const formattedThreshold = formatThresholdWan(item.threshold)

    return `${item.label}總餘: ${formattedBalance} 已經${comparisonText}${formattedThreshold}，請注意`
  })
}

const formatSuccessNames = ({ list, withCardCount }) => {
  if (withCardCount) {
    return list
      .map(item => (
        item.cardCount != null
          ? `${item.name} (${item.cardCount}张)`
          : item.name
      ))
      .join(',\n')
  }

  return list.map(item => item.name).join(', ')
}

const messageFormat = {
  formatUpstreamBalanceReport({
    fastPayBalance,
    fastPayBlackBalance,
    tgPayBalance,
    leePayBalance,
  }) {
    return `FastPay總餘: ${fastPayBalance}\nFastPay黑名單總餘: ${fastPayBlackBalance}\nTGPay總餘: ${tgPayBalance}\nLeePay總餘: ${leePayBalance}`
  },

  formatJiliBalanceReport({ gotymeBalance = 'N/A' }) {
    return `\nGotyme總餘: ${gotymeBalance}`
  },

  formatLowBalanceAlert({ alerts = [], notifyUserText = '' }) {
    const lines = formatBalanceAlertLines({ alerts, comparisonText: '低於' })
    const body = lines.join('\n')

    return notifyUserText ? `${notifyUserText}\n${body}` : body
  },

  formatHighBalanceAlert({ alerts = [], notifyUserText = '' }) {
    const lines = formatBalanceAlertLines({ alerts, comparisonText: '高於' })
    const body = lines.join('\n')

    return notifyUserText ? `${notifyUserText}\n${body}` : body
  },

  buildRefreshReportText({ rows }) {
    if (rows.length === 0) {
      return '没有需要刷新的通道或商户名稱'
    }

    const configs = [
      {
        name: '通道',
        list: rows.filter(item => !item.isMerchant),
      },
      {
        name: '商戶名稱',
        list: rows.filter(item => item.isMerchant),
      },
    ]

    const hasFailed = rows.some(item => item.message !== 'success')
    const messageParts = []

    for (const { name, list } of configs) {
      if (list.length === 0) continue

      const successList = list.filter(item => item.message === 'success')
      const failedList = list.filter(item => item.message !== 'success')

      if (successList.length) {
        messageParts.push(
          `刷新『成功』${name}:\n${formatSuccessNames({
            list: successList,
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

        messageParts.push(`刷新『失敗』${name}:\n${failedText}`)
      }
    }

    messageParts.push('>>> 皆已刷新完成')

    if (hasFailed) {
      messageParts.push('>>> 失敗的部分請手動刷新')
    }

    return `\n${messageParts.join('\n\n')}\n`
  },

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
    const formattedTotalPayAmount = tools.formatAmountWithCommas({ amount: totalPayAmount, maximumFractionDigits: 0 })
    const topMerchantList = Array.isArray(summaryRow?.merchantList)
      ? summaryRow.merchantList.slice(0, 5)
      : []

    const topMerchantLines = topMerchantList.map(merchant => {
      const successAmount = Number(merchant?.OrderSuccessAmount ?? 0)
      const formattedSuccessAmount = tools.formatAmountWithCommas({ amount: successAmount, maximumFractionDigits: 0 })
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

export default messageFormat
