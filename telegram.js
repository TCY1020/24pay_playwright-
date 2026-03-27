import TelegramBot from 'node-telegram-bot-api';

let botInstance = null;

/**
 * 啟動 Telegram Bot（輪詢模式）
 * @param {object} param0
 * @param {string} param0.token - Telegram bot token
 * @param {boolean} param0.polling - 是否啟用輪詢
 * @returns {TelegramBot}
 */
export function startTelegramBot({ token = process.env.TELEGRAM_BOT_TOKEN , polling = true } = {}) {
  if (botInstance) return botInstance;
  if (!token) {
    throw new Error('請先設定環境變數 TELEGRAM_BOT_TOKEN');
  }

  botInstance = new TelegramBot(token, { polling });

  // 訊息接收示範：群組傳 `/ping` 或 `!ping` 就回 `pong`
  botInstance.on('message', async (msg) => {
    const chatId = msg?.chat?.id;
    const text = msg?.text;
    if (!chatId || !text) return;

    if (text === '/ping' || text === '!ping') {
      await botInstance.sendMessage(chatId, 'pong');
      return;
    }

    // 你可以在這裡擴充更多指令 / 事件處理
  });

  return botInstance;
}

/**
 * 在「群組」傳遞訊息
 * @param {number|string} chatId - 群組 chat id（通常是負數，例如 -100xxxx）
 * @param {string} text - 要傳的內容
 * @param {object} options - 送訊息選項（可選）
 */
export async function sendGroupMessage(chatId, text, options = {}) {
  if (!botInstance) startTelegramBot();
  if (!chatId) throw new Error('請提供 group chatId（數字）');
  if (!text) throw new Error('訊息文字不可為空');

  return botInstance.sendMessage(chatId, text, options);
}
