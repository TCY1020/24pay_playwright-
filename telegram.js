import TelegramBot from 'node-telegram-bot-api'

let botInstance = null

const telegramTools = {
  startTelegramBot: async ({ token = process.env.TELEGRAM_BOT_TOKEN , polling = true } = {}) => {
    if (botInstance) return botInstance
    if (!token) {
      throw new Error('請先設定環境變數 TELEGRAM_BOT_TOKEN')
    }
  
    botInstance = new TelegramBot(token, { polling: polling })
  
    // 訊息接收示範：群組傳 `/ping` 或 `!ping` 就回 `pong`
    botInstance.on('message', async (msg) => {
      const chatId = msg?.chat?.id
      const text = msg?.text
      if (!chatId || !text) return
  
      if (text === '/ping' || text === '!ping') {
        await botInstance.sendMessage(chatId, 'pong')

        return
      }
  
      // 你可以在這裡擴充更多指令 / 事件處理
    })
  
    return botInstance
  },

  sendGroupMessage: async (chatId, text, options = {}) => {
    if (!botInstance) startTelegramBot()
    if (!chatId) throw new Error('請提供 group chatId（數字）')
    if (!text) throw new Error('訊息文字不可為空')
  
    return botInstance.sendMessage(chatId, text, options)
  }
}

export default telegramTools