import formatJiliBalanceReport from '../usecases/jili/formatJiliBalanceReport.js'
import getChannelAllAccountBalance from '../usecases/jili/getChannelAllAccountBalance.js'

const startJiliBalanceMonitorFlow = async ({
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
      const gotymeBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'Gotyme' })
      const message = formatJiliBalanceReport({
        gotymeBalance: gotymeBalanceData?.balance ?? 'N/A',
      })
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startJiliBalanceMonitorFlow
