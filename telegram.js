import TelegramBot from 'node-telegram-bot-api'

class TelegramTools {
  constructor({ token }) {
    this.token = token
    
    if (!this.token) {
      throw new Error('請先設定環境變數 TELEGRAM_BOT_TOKEN')
    }

    // 直接在建構時初始化，polling 設為 false 避免衝突
    // 如果需要接收訊息，則在外面手動呼叫 startTelegramBot()
    this.botInstance = new TelegramBot(this.token, { polling: false })
  }

  startPolling = () => {
    this.botInstance.startPolling()
  }

  onMessage = ({ handler }) => {
    this.botInstance.on('message', handler)
  }

  sendGroupMessage =  ({ chatId, text, options = {} }) => {
    if (!chatId) throw new Error('請提供 group chatId（數字）')
    if (!text) throw new Error('訊息文字不可為空')

    return this.botInstance.sendMessage(chatId, text, options)
  }
}
export default TelegramTools
