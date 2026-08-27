import messageFormat from '../../telegram/messageFormat.js'
import getChannelAllAccountBalance from '../usecases/jili/getChannelAllAccountBalance.js'
import getUpstreamBalances from '../usecases/upstream/getUpstreamBalances.js'

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
      const balances = await getUpstreamBalances({ config })

      const gotymeBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'Gotyme' })
      const jiliBalanceReportText = messageFormat.formatJiliBalanceReport({
        gotymeBalance: tools.formatAmountWithCommas({ amount: gotymeBalanceData?.balance ?? 'N/A' }),
      })
      const upstreamBalanceReportText = messageFormat.formatUpstreamBalanceReport({
        fastPayBalance: tools.formatAmountWithCommas({ amount: balances.fastPayBalanceData?.data?.[0]?.totalAmount ?? 'N/A' }),
        fastPayBlackBalance: tools.formatAmountWithCommas({ amount: balances.fastPayBlackBalanceData?.data?.[0]?.totalAmount ?? 'N/A' }),
        tgPayBalance: tools.formatAmountWithCommas({ amount: balances.tgPayBalanceData?.param?.balance ?? 'N/A' }),
      })
      const message = `${jiliBalanceReportText}\n${upstreamBalanceReportText}`
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startBalanceMonitorFlow
