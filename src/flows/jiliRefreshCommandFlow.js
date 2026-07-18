import { runJiliChannelProcess, runJiliMarchantNameProcess } from '../usecases/jili/runJiliChannelProcess.js'
import messageFormatByjili from '../usecases/jili/messageFormatByjili.js'

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

  return messageFormatByjili.buildRefreshReportText({ rows })
}

export default runRefresh
