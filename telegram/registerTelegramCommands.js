import startBalanceMonitorFlow from '../src/flows/balanceMonitorFlow.js'
import runRefreshCommandFlow from '../src/flows/refreshCommandFlow.js'
import tools from '../tools.js'

const HELP_LINE_LIST = [
  '可用指令：',
  '/start - 批次刷新通道',
  '/monitor_on - 启动余额监控',
  '/monitor_off - 停止余额监控',
  '/help - 显示说明',
]
const HELP_TEXT = HELP_LINE_LIST.join('\n')

/**
 * 註冊 Telegram 指令：
 * /start 批次刷新；/monitor_on|/monitor_off 控制餘額監控；/help 顯示說明
 */
const registerTelegramCommands = ({
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
          await telegramTools.sendGroupMessage({ chatId, text: '余额监控已在运行中' })

          return
        }

        isMonitorRunning = true
        stopMonitor = false
        await telegramTools.sendGroupMessage({ chatId, text: '已启动余额监控' })

        startBalanceMonitorFlow({
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
          await telegramTools.sendGroupMessage({ chatId, text: '余额监控目前未运行' })

          return
        }

        stopMonitor = true
        await telegramTools.sendGroupMessage({
          chatId,
          text: '已送出停止信号，等待本轮结束后停止',
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
          text: '正在处理中，请稍后再试',
        })

        return
      }

      isProcessing = true

      try {
        const reportText = await runRefreshCommandFlow({
          chatId,
          channelNameList: config.REFRESH_CHANNEL_NAME_LIST,
          jiliContext,
          telegramTools,
          merchantList: config.MERCHANT_LIST,
          config,
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
错误码:
${err?.message ?? err ?? '未知错误'}
`,
        })
      } finally {
        isProcessing = false
      }
    },
  })
}

export default registerTelegramCommands
