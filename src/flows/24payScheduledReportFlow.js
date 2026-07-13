import { getConfig } from '../../config.js'
import tools from '../../tools.js'
import toolBy24pay from '../pages/24payTools.js'
import messageFormatBy24pay from '../usecases/24pay/messageFormatBy24pay.js'
import paymentOrderStats from '../usecases/24pay/paymentOrderStats.js'

const config = getConfig()
const REPORT_HOURS_UTC8 = config.REPORT_HOURS_UTC8
const NOTIFY_USER_ID = config.NOTIFY_24PAY_SCHEDULED_REPORT_USER_ID
const PAYMENT_STATS_PAGE = config.PAYMENT_STATS_PAGE

const start24payScheduledReportFlow = async ({ page, telegramTools, groupChatId }) => {
  // 開啟代收訂單統計
  await toolBy24pay.openSideMenu({
    page,
    mainMenuId: `#${PAYMENT_STATS_PAGE.mainMenuId}`,
    subMenuId: `#${PAYMENT_STATS_PAGE.subMenuId}`,
  })

  // 設定下次執行時間
  const scheduleNext = () => {
    const delayMs = tools.getDelayToNextReport({ reportHoursUtc8: REPORT_HOURS_UTC8 })

    setTimeout(async () => {
      try {
        const nowParts = tools.getUtc8Parts()
        const startDate = `${nowParts.year}-${nowParts.month}-${nowParts.day} 00:00:00`
        const endDate = `${nowParts.year}-${nowParts.month}-${nowParts.day} 23:59:59`
        await paymentOrderStats.setPaymentOrderStatsMenuFilter({ page, startDate, endDate })
        await paymentOrderStats.submitPaymentOrderStats({ page })
        await page.waitForTimeout(3000)
        await paymentOrderStats.clickPaymentDownArrowKey({ page })
        const todayPaymentOrderStats = await paymentOrderStats.getTodayPaymentOrderStats({ page })
        const sortedTodayPaymentOrderStats = paymentOrderStats.sortMerchantBySuccessAmount({ todayPaymentOrderStats })
        const text = messageFormatBy24pay.format24payScheduledReport({
          todayPaymentOrderStats: sortedTodayPaymentOrderStats,
          // notifyUserText: NOTIFY_USER_TEXT,
          notifyUserText: `@${NOTIFY_USER_ID.join(' @')}`,
        })
        await telegramTools.sendGroupMessage({ chatId: groupChatId, text })
      } catch (err) {
        console.error('[24pay scheduled report] 發送失敗:', err?.message ?? err)
      } finally {
        scheduleNext()
      }
    }, delayMs)
  }

  scheduleNext()
}

export default start24payScheduledReportFlow