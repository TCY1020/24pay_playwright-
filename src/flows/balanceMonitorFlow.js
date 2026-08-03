import getChannelAllAccountBalance from '../usecases/jili/getChannelAllAccountBalance.js'
import getUpstreamBalances from '../usecases/upstream/getUpstreamBalances.js'
import messageFormat from '../../telegram/messageFormat.js'

const startBalanceMonitorFlow = async ({
  tools,
  jiliPage,
  telegramTools,
  groupChatId,
  config,
  shouldStop = () => false,
}) => {
  let isFirstRun = true
  while (!shouldStop()) {
    if (!isFirstRun) {
      await tools.sleep(config.RESEARCH_INTERVAL_MS)
      if (shouldStop()) break
    }
    isFirstRun = false

    try {
      const {
        fastPayBalanceData,
        fastPayBlackBalanceData,
        tgPayBalanceData,
        leePayBalanceData,
      } = await getUpstreamBalances({ config })

      const gotymeBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'Gotyme' })
      const jiliBalanceReportText = messageFormat.formatJiliBalanceReport({
        gotymeBalance: tools.formatAmountWithCommas(gotymeBalanceData?.balance ?? 'N/A'),
      })
      const upstreamBalanceReportText = messageFormat.formatUpstreamBalanceReport({
        fastPayBalance: tools.formatAmountWithCommas(fastPayBalanceData?.data?.[0]?.totalAmount ?? 'N/A'),
        fastPayBlackBalance: tools.formatAmountWithCommas(fastPayBlackBalanceData?.data?.[0]?.totalAmount ?? 'N/A'),
        tgPayBalance: tools.formatAmountWithCommas(tgPayBalanceData?.param?.balance ?? 'N/A'),
        leePayBalance: tools.formatAmountWithCommas(leePayBalanceData?.data?.balance ?? 'N/A'),
      })
      const message = `${jiliBalanceReportText}\n${upstreamBalanceReportText}`
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startBalanceMonitorFlow
