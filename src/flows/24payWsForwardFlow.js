import extract24payForwardMessage from '../usecases/24pay/extract24payForwardMessage.js'

const start24payWsForwardFlow = ({ page, telegramTools, groupChatId, config }) => {
  page.on('websocket', ws => {
    ws.on('framereceived', async frame => {
      try {
        let message = extract24payForwardMessage(frame.payload)
        if (!message) return
        const notifyCustomerServiceList = config.NOTIFY_CUSTOMER_SERVICE_LIST
        message += ` @${notifyCustomerServiceList.join(' @')}`

        await telegramTools.sendGroupMessage({ chatId: groupChatId, text: message })
      } catch (err) {
        console.error('[24pay websocket] 訊息處理失敗:', err?.message ?? err)
      }
    })
  })
}

export default start24payWsForwardFlow
