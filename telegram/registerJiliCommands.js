import startJiliBalanceMonitorFlow from '../src/flows/jiliBalanceMonitorFlow.js'
import runRefresh from '../src/flows/jiliRefreshCommandFlow.js'
import tools from '../tools.js'

const HELP_TEXT = [
  '可用指令：',
  '/start - 批次刷新通道',
  '/monitor_on - 啟動餘額監控',
  '/monitor_off - 停止餘額監控',
  '/help - 顯示說明',
].join('\n')

/**
 * 註冊 jili Telegram 指令：
 * /start 批次刷新；/monitor_on|/monitor_off 控制餘額監控；/help 顯示說明
 */
const registerJiliCommands = ({
  telegramTools,
  config,
  jiliContext,
  jiliPage,
}) => {
  let isProcessing = false
  let isMonitorRunning = false
  let stopMonitor = false

  telegramTools.onMessage({
    handler: async msg => {
      const chatId = msg.chat.id
      const text = msg.text

      if (text === '/help') {
        await telegramTools.sendGroupMessage({ chatId, text: HELP_TEXT })

        return
      }

      if (text === '/monitor_on') {
        if (isMonitorRunning) {
          await telegramTools.sendGroupMessage({ chatId, text: '餘額監控已在運行中' })

          return
        }

        isMonitorRunning = true
        stopMonitor = false
        await telegramTools.sendGroupMessage({ chatId, text: '已啟動餘額監控' })

        startJiliBalanceMonitorFlow({
          tools,
          jiliPage,
          telegramTools,
          groupChatId: config.BALANCE_NOTIFICATION_GROUP_CHAT_ID,
          config,
          shouldStop: () => stopMonitor,
        }).finally(() => {
          isMonitorRunning = false
        })

        return
      }

      if (text === '/monitor_off') {
        if (!isMonitorRunning) {
          await telegramTools.sendGroupMessage({ chatId, text: '餘額監控目前未運行' })

          return
        }

        stopMonitor = true
        await telegramTools.sendGroupMessage({
          chatId,
          text: '已送出停止訊號，等待本輪結束後停止',
        })

        return
      }

      if (text !== '/start') {
        if (typeof text === 'string' && text.startsWith('/')) {
          await telegramTools.sendGroupMessage({ chatId, text: HELP_TEXT })
        }

        return
      }

      if (isProcessing) {
        await telegramTools.sendGroupMessage({
          chatId,
          text: '正在處理中，請稍後再試',
        })

        return
      }

      isProcessing = true

      try {
        const reportText = await runRefresh({
          chatId,
          channelNameList: config.REFRESH_CHANNEL_NAME_LIST,
          jiliContext,
          telegramTools,
          merchantList: config.MERCHANT_LIST,
        })
        await telegramTools.sendGroupMessage({
          chatId,
          text: reportText,
        })
      } catch (err) {
        console.error('[流程] 刷新指令處理失敗:', err?.message ?? err)
        await telegramTools.sendGroupMessage({
          chatId,
          text: `
刷新指令处理失败，请两分钟后重试,如果连续发生超过两次,请自行手动刷新,并等Jason上班时通知他,感谢!
錯誤碼:
${err?.message ?? err ?? '未知錯誤'}
`,
        })
      } finally {
        isProcessing = false
      }
    },
  })
}

export default registerJiliCommands
