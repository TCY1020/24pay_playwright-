const stripAnsi = text => text.replace(/\x1B\[[0-9;]*m/g, '')

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

const messageFormatByjili = {
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
}

export default messageFormatByjili
