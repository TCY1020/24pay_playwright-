import formatJiliBalanceReport from '../usecases/jili/formatJiliBalanceReport.js'
import getChannelAllAccountBalance from '../usecases/jili/getChannelAllAccountBalance.js'
import getGcashTooLowBalanceList from '../usecases/jili/getGcashTooLowBalanceList.js'

const startJiliBalanceMonitorFlow = async ({
  tools,
  jiliPage,
  telegramTools,
  groupChatId,
  config,
}) => {
  let isFirstRun = true
  while (true) {
    if (!isFirstRun) {
      await tools.sleep(config.RESEARCH_INTERVAL_MS)
    }
    isFirstRun = false

    try {
      const gcashLowBalanceThreshold = config.GCASH_LOW_BALANCE_THRESHOLD
      const gcashLowAccountList = await getGcashTooLowBalanceList({
        tools,
        page: jiliPage,
        lessAmount: gcashLowBalanceThreshold,
      })
      const payMayaBalanceData = await getChannelAllAccountBalance({ tools, page: jiliPage, channelName: 'PayMaya' })
      const MayaBusinessBalanceData = await getChannelAllAccountBalance({ tools, page: jiliPage, channelName: 'gcashwap-2' })
      const message = formatJiliBalanceReport({
        threshold: gcashLowBalanceThreshold,
        lowList: gcashLowAccountList,
        payMayaBalance: payMayaBalanceData?.balance ?? 'N/A',
        MayaBusinessBalance: MayaBusinessBalanceData?.balance ?? 'N/A',
      })
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startJiliBalanceMonitorFlow
