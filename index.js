import { chromium } from 'playwright';
import tools from './tools.js';
import { startTelegramBot, sendGroupMessage } from './telegram.js';
import config from './config.json' with { type: 'json' };

// 讓 `npm run dev` 同時啟動 telegram bot（若已設定 token）
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN
if (telegramToken) {
  try {
    startTelegramBot({token:telegramToken});
  } catch (err) {
    console.error('[telegram] 初始化失敗:', err?.message ?? err);
  }
}

const browser = await chromium.launch({ headless: false });
let page = await browser.newPage();
await tools.login(page)
await tools.gotoUrl(page, 'https://ptrcqps9.2424ph.com/#/user_system/user_account')
await tools.selectGcashWap(page)
const gcashBalanceList = await tools.getGcashBalanceList(page)
const gcashBalanceTooLowAccountList = tools.balanceListFilter({balanceList:gcashBalanceList, lessAmount: 2000})
console.log(gcashBalanceTooLowAccountList)
console.log('chatid',config.TELEGRAM_GROUP_CHAT_ID)

// 若你有設定群組 chat id，就把結果通知到群組
const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID;
if (groupChatId && gcashBalanceTooLowAccountList?.length) {
  const message = [
    `低於 2000 的帳戶：(${gcashBalanceTooLowAccountList.length} 筆)`,
    ...gcashBalanceTooLowAccountList.map((x) => `- ${x.name}: ${x.balance}`),
  ].join('\n');

  try {
    await sendGroupMessage(groupChatId, message);
  } catch (err) {
    console.error('[telegram] 傳送群組訊息失敗:', err?.message ?? err);
  }
}
