import tools from '../tools.js'

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

const resolveUncertainChannelLabel = (merchantName, uncertainChannelMap = {}) => {
  const key = String(merchantName ?? '').toLowerCase()

  return uncertainChannelMap[key] ?? '找不到通道'
}

const filterNonZeroSuccessAmountList = (merchantTop5List) => {
  return merchantTop5List.filter(item => item.successAmount !== 0)
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

  formatMerchantPaymentAmountNotif({ merchantTop5List, uncertainChannelMap }) {
    merchantTop5List = filterNonZeroSuccessAmountList(merchantTop5List)
    let body ="排名前五的商户：\n"
    merchantTop5List.forEach((merchant) => {
      body += `${merchant.memberName}：${tools.formatAmountWithCommas({ amount: merchant.successAmount })}\n`
    })

    body += "\n——————————\n"

    for(const item of merchantTop5List) {
      const merchantName = item.memberName
      const channelName = merchantName.includes('_') ? merchantName.split('_').pop() : ""
      const successAmount = tools.formatAmountWithCommas({ amount: item.successAmount })
      if(channelName.toLowerCase() === 'gotyme') {
        body += `${merchantName}\nGoTyme扫码 ${successAmount}\n——————————\n`
      }else if(channelName.toLowerCase() === 'gcash') {
        body += `${merchantName}\nGCas扫码 ${successAmount}\n——————————\n`
      }else if(channelName.toLowerCase() === 'maya') {
        body += `${merchantName}\nMaya直连 ${successAmount}\n——————————\n`
      }else{
        const channelText = resolveUncertainChannelLabel(merchantName, uncertainChannelMap)
        body += `${merchantName}\n${channelText} ${successAmount}\n——————————\n`
      }
    }


    return body
  },
}

export default messageFormat
