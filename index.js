import { chromium } from 'playwright';
import tools from './tools.js';
import telegramTools from './telegram.js'
import config from './config.json' with { type: 'json' }
import path from 'path'
import fs from 'fs'

// 讓 `npm run dev` 同時啟動 telegram bot（若已設定 token）
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN
if (telegramToken) {
  try {
    telegramTools.startTelegramBot({token:telegramToken});
  } catch (err) {
    console.error('[telegram] 初始化失敗:', err?.message ?? err);
  }
}

const authJsonPath = path.join(process.cwd(), 'auth.json')
const hasStorageState = fs.existsSync(authJsonPath)

if (!hasStorageState) {
  console.error('找不到 auth.json。請先在本機執行: npm run auth-setup，產生登入狀態後再執行 npm run dev')
  process.exit(1)
}

// VM / 無桌面環境：固定無頭，不在本機開視窗。
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ storageState: authJsonPath })
const page = await context.newPage()
await tools.gotoUrl(page, 'https://ptrcqps9.2424ph.com/#/user_system/user_account')

const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID;

await tools.checkAndNotify({page,groupChatId})

const researchIntervalMs = process.env.RESEARCH_INTERVAL_MS || config.RESEARCH_INTERVAL_MS

while (true) {
  await tools.sleep(researchIntervalMs)

  try {
    await tools.reSearch(page)
    await tools.checkAndNotify({page,groupChatId})
  } catch (err) {
    console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err);
  }
}
