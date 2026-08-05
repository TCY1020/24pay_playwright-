import { runJiliChannelProcess, runJiliMarchantNameProcess } from '../usecases/jili/runJiliChannelProcess.js'
import getUpstreamBalances from '../usecases/upstream/getUpstreamBalances.js'
import messageFormat from '../../telegram/messageFormat.js'
import tools from '../../tools.js'

const runRefreshCommandFlow = async ({
  chatId,
  channelNameList,
  jiliContext,
  telegramTools,
  merchantList,
  config,
}) => {
  const refreshPage = {}
  for (const name of channelNameList) {
    refreshPage[name] = await jiliContext.newPage()
  }

  const channelPromiseList = channelNameList.map(name =>
    runJiliChannelProcess({
      page: refreshPage[name],
      name,
      chatId,
      telegramTools,
    }),
  )

  const hasMerchantList = (merchantList ?? []).length > 0
  if (hasMerchantList) {
    channelPromiseList.push(runJiliMarchantNameProcess({
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

  const {
    fastPayBalanceData,
    fastPayBlackBalanceData,
    tgPayBalanceData,
    leePayBalanceData,
  } = await getUpstreamBalances({ config })
  const jiliReportText = messageFormat.buildRefreshReportText({ rows })

  const upstreamReportText = messageFormat.formatUpstreamBalanceReport({
    fastPayBalance: tools.formatAmountWithCommas(fastPayBalanceData?.data?.[0]?.totalAmount ?? 'N/A'),
    fastPayBlackBalance: tools.formatAmountWithCommas(fastPayBlackBalanceData?.data?.[0]?.totalAmount ?? 'N/A'),
    tgPayBalance: tools.formatAmountWithCommas(tgPayBalanceData?.param?.balance ?? 'N/A'),
    leePayBalance: tools.formatAmountWithCommas(leePayBalanceData?.data?.balance ?? 'N/A'),
  })


  return `${jiliReportText}\n${upstreamReportText}`
}

export default runRefreshCommandFlow
