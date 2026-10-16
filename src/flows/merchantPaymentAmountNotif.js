import map from '../../map.js' 
import messageFormat from '../../telegram/messageFormat.js'
import tools from '../../tools.js'
import jiliTools from '../pages/jiliTools.js'

const merchantPaymentAmountNotif = async ({ jiliContext, telegramTools, config }) => {
  const jiliPage = await jiliContext.newPage()
  await jiliPage.goto('https://ptrcqps9.2424ph.com/#/member_system/member_statistics')

  const scheduleNext = () => {
    const dalaysMs = tools.getDelayToNextReport({ reportHourList: config.REPORT_HOURS_UTC8_LIST })
    setTimeout(async () => {
      try {
        const nowParts = tools.getUtc8Parts()
        const startTime = `${nowParts.year}-${nowParts.month}-${nowParts.day}`
        const endTime = `${nowParts.year}-${nowParts.month}-${nowParts.day}`
        const nowTime = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`
        await jiliTools.inputStartTimeEndTime({ page: jiliPage, startTime, endTime })
        await jiliTools.selectPageSize({ page: jiliPage, pageSizeIndex: map.selectMap.pageSize[500] })
        await jiliTools.reSearch({ page: jiliPage, buttonIndex: 0 })
        let totalSuccessPaymentAmount = await jiliPage
          .locator('.number-data .item')
          .filter({ has: jiliPage.locator('h2', { hasText: '成功金额' }) })
          .locator('p')
          .innerText()
        totalSuccessPaymentAmount = tools.formatAmountWithCommas({ amount: totalSuccessPaymentAmount })

        const list = await jiliTools.getMemberDataList({ page: jiliPage })
        const merchantTop5List = tools.getAscendingSortList({ itemList: list, key: 'successAmount' }).reverse().slice(0, 5)
        const body = messageFormat.formatMerchantPaymentAmountNotif({
          merchantTop5List,
          uncertainChannelMap: config.UNCERTAIN_CHANNEL_MAP ?? {},
        })
        const header = `@${config.MERCHANT_PAYMENT_AMOUNT_NOTIF_LIST.join(' @')}\n ${nowTime} 總跑量 ${totalSuccessPaymentAmount}`
        const text = `${header}\n\n${body}`

        await telegramTools.sendGroupMessage({ chatId: config.BALANCE_NOTIFICATION_GROUP_CHAT_ID, text })

      } catch (error) {
        console.error(error)
      } finally {
        scheduleNext()
      }
    }, dalaysMs)
  }

  scheduleNext()
}

export default merchantPaymentAmountNotif