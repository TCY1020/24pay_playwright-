import { runJiliChannelProcess, runJiliMarchantNameProcess } from '../usecases/jili/runJiliChannelProcess.js'

const stripAnsi = text => text.replace(/\x1B\[[0-9;]*m/g, '')

const buildRefreshReportText = ({ rows }) => {
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

  const messageParts = []
  let hasFailed = false

  for (const { name, list } of configs) {
    if (list.length === 0) continue

    const successList = list.filter(item => item.message === 'success')
    const failedList = list.filter(item => item.message !== 'success')

    if (successList.length) {
      messageParts.push(
        `刷新『成功』${name}:\n${successList.map(item => item.name).join(', ')}`,
      )
    }

    if (failedList.length) {
      hasFailed = true

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
}

const runRefresh = async ({
  chatId,
  channelNameList,
  jiliContext,
  tools,
  telegramTools,
  merchantList,
}) => {
  const refreshPage = {}
  for (const name of channelNameList) {
    refreshPage[name] = await jiliContext.newPage()
  }

  const channelPromiseList = channelNameList.map(name =>
    runJiliChannelProcess({
      tools,
      page: refreshPage[name],
      name,
      chatId,
      telegramTools,
    }),
  )

  const hasMerchantList = (merchantList ?? []).length > 0
  if (hasMerchantList) {
    channelPromiseList.push(runJiliMarchantNameProcess({
      tools,
      page: await jiliContext.newPage(),
      merchantList,
      chatId,
      telegramTools,
    }))
  }

  if (channelPromiseList.length === 0) {
    return '没有需要刷新的通道或商户名稱'
  }

  const results = await Promise.all(channelPromiseList)
  const rows = results.flatMap(result => Array.isArray(result) ? result : [result])

  return buildRefreshReportText({ rows })
}

export default runRefresh
