import formatJiliBalanceReport from '../usecases/jili/formatJiliBalanceReport.js'
import getChannelAllAccountBalance from '../usecases/jili/getChannelAllAccountBalance.js'
import getGcashTooLowBalanceList from '../usecases/jili/getGcashTooLowBalanceList.js'

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
      const gcashLowBalanceThreshold = config.GCASH_LOW_BALANCE_THRESHOLD
      const gcashLowAccountList = await getGcashTooLowBalanceList({
        page: jiliPage,
        lessAmount: gcashLowBalanceThreshold,
      })
      const payMayaBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'PayMaya' })
      const mayaBusinessBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'gcashwap-2' })
      const gotymeBalanceData = await getChannelAllAccountBalance({ page: jiliPage, channelName: 'Gotyme' })
      const message = formatJiliBalanceReport({
        threshold: gcashLowBalanceThreshold,
        lowList: gcashLowAccountList,
        payMayaBalance: payMayaBalanceData?.balance ?? 'N/A',
        mayaBusinessBalance: mayaBusinessBalanceData?.balance ?? 'N/A',
        gotymeBalance: gotymeBalanceData?.balance ?? 'N/A',
      })
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startJiliBalanceMonitorFlow
