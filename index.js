import { chromium } from 'playwright';
import tools from './tools.js';
import telegramTools from './telegram.js'
import path from 'path'
import fs from 'fs'


// =====================
// 🔧 載入設定檔（config.json fallback to .env）
// =====================
const configPath = path.join(process.cwd(), 'config.json')
let config = {}
try{
  if(fs.existsSync(configPath)){
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  }
}catch(err){
  console.error('[config] 讀取 config.json 失敗，改用 .env', err?.message)
}

// =====================
// 🔐 檢查登入狀態（auth.json 必須存在）
// =====================
const authJsonPath24pay = path.join(process.cwd(), '24pay_auth.json')
const hasStorageState24pay = fs.existsSync(authJsonPath24pay)
const authJsonPathJili = path.join(process.cwd(), 'jili_auth.json')
const hasAuthJsonPathJili = fs.existsSync(authJsonPathJili)

if ( !hasAuthJsonPathJili || !hasStorageState24pay ) {
  console.error('找不到 auth.json。請先在本機執行: npm run auth-setup，產生登入狀態後再執行 npm run dev')
  process.exit(1)
}



// 讓 `npm run dev` 同時啟動 telegram bot（若已設定 token）
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN
if (telegramToken) {
  try {
    telegramTools.startTelegramBot({token:telegramToken});
  } catch (err) {
    console.error('[telegram] 初始化失敗:', err?.message ?? err);
  }
}
const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID;

const browser = await chromium.launch({ headless: true })

// 24pay部分
const _24payContext = await browser.newContext({ storageState: authJsonPath24pay })
const _24payPage  = await _24payContext.newPage()
await tools.gotoUrl({page:_24payPage, url:'https://www.24pay.sbs/home/index'})

// ② WebSocket（抓主動推送）
_24payPage.on('websocket', async ws => {
  ws.on('framereceived',async frame => {
    const data = frame.payload

    let msg = data.replace(/\u001e/g, '')

    msg = JSON.parse(msg)

    if(msg.type === 1){
      const message = msg.arguments[0]
      await telegramTools.sendGroupMessage(groupChatId, message)
    }
  })
})



// VM / 無桌面環境：固定無頭，不在本機開視窗。
// 吉利部分 
const jiliContext = await browser.newContext({ storageState: authJsonPathJili })
const jiliPage = await jiliContext.newPage()
await tools.gotoUrl({page:jiliPage, url:'https://ptrcqps9.2424ph.com/#/user_system/user_account'})


await tools.checkAndNotify({page:jiliPage,groupChatId})

const researchIntervalMs = process.env.RESEARCH_INTERVAL_MS || config.RESEARCH_INTERVAL_MS

while (true) {
  await tools.sleep(researchIntervalMs)

  try {
    await tools.reSearch(jiliPage)
    await tools.checkAndNotify({page:jiliPage,groupChatId})
  } catch (err) {
    console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err);
  }
}
