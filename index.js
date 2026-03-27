import { chromium } from 'playwright';
import tools from './tools.js';
// import { startTelegramBot, sendGroupMessage } from './telegram.js';
import telegramTools from './telegram.js'
import config from './config.json' with { type: 'json' };

// 讓 `npm run dev` 同時啟動 telegram bot（若已設定 token）
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN
if (telegramToken) {
  try {
    telegramTools.startTelegramBot({token:telegramToken});
  } catch (err) {
    console.error('[telegram] 初始化失敗:', err?.message ?? err);
  }
}

const browser = await chromium.launch({ headless: false });
let page = await browser.newPage();
await tools.login(page)
await tools.gotoUrl(page, 'https://ptrcqps9.2424ph.com/#/user_system/user_account')
await tools.selectGcashWap(page)
await tools.checkBalancePageRefresh(page)

const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID;

await tools.checkAndNotify({page,groupChatId})

while (true) {
  await tools.sleep(config.RESEARCH_INTERVAL_MS)

  try {
    await tools.reSearch(page)
    await tools.checkAndNotify({page,groupChatId})
  } catch (err) {
    console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err);
  }
}
