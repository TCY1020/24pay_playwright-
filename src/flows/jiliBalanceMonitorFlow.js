import getGcashTooLowBalanceList from '../usecases/jili/getGcashTooLowBalanceList.js'
import getPayMayaAllAccountBalance from '../usecases/jili/getPayMayaAllAccountBalance.js'
import formatJiliBalanceReport from '../usecases/jili/formatJiliBalanceReport.js'

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
      const lowAccountList = await getGcashTooLowBalanceList({
        tools: tools,
        page: jiliPage,
        lessAmount: gcashLowBalanceThreshold
      })
      const payMayaBalanceData = await getPayMayaAllAccountBalance({ tools: tools, page: jiliPage })
      const message = formatJiliBalanceReport({
        lowList: lowAccountList,
        threshold: gcashLowBalanceThreshold,
        payMayaBalance: payMayaBalanceData?.balance ?? 'N/A'
      })
      await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
    } catch (err) {
      console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
    }
  }
}

export default startJiliBalanceMonitorFlow
