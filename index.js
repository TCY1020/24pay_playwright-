import { chromium } from 'playwright'
import tools from './tools.js'
import telegramTools from './telegram.js'
import { generate } from 'otplib'
import path from 'path'
import fs from 'fs'


// =====================
// 🔧 載入設定檔（config.json fallback to .env）
// =====================
const config = tools.getConfig()

// =====================
// 🔐 檢查登入狀態（auth.json 必須存在）
// =====================
const authJsonPathJili = path.join(process.cwd(), 'jili_auth.json')
const hasAuthJsonPathJili = fs.existsSync(authJsonPathJili)

if ( !hasAuthJsonPathJili ) {
  console.error(`
    Jili憑證${hasAuthJsonPathJili? '已找到' :'未找到'}\n
    請先在本機執行: npm run auth-setup，產生登入狀態後再執行 npm run dev`)
  process.exit(1)
}



// 讓 `npm run dev` 同時啟動 telegram bot（若已設定 token）
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || config.TELEGRAM_BOT_TOKEN
if (telegramToken) {
  try {
    telegramTools.startTelegramBot({ token:telegramToken })
  } catch (err) {
    console.error('[telegram] 初始化失敗:', err?.message ?? err)
  }
}
const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID || config.TELEGRAM_GROUP_CHAT_ID

const browser = await chromium.launch({ headless: true })

// 24pay
const _24payContext= await browser.newContext()
const _24payPage = await _24payContext.newPage()
const secret = config.SECRET_24PAY
const token = await generate({ secret: secret })
await _24payPage.goto('https://www.24pay.sbs/home/login')
await _24payPage.locator('[name="Name"]').type(config.ACCOUNT_24PAY, { delay: 100 })
await _24payPage.locator('[name="Password"]').type(config.PASSWORD_24PAY, { delay: 100 })
await _24payPage.locator('[name="GoogleVerificationCode"]').type(token, { delay: 100 })
await _24payPage.locator('.loginin').click()
try{
  await _24payPage.waitForSelector(`text=${config.ACCOUNT_24PAY}`, { timeout: 5000 })
  console.log('24pay 驗證成功：已登入')
}catch(err){
  console.error('24pay 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
}

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
await tools.gotoUrl({ page:jiliPage, url:'https://ptrcqps9.2424ph.com/#/user_system/user_account' })
try{
  await jiliPage.waitForSelector(`text=${config.ACCOUNT_jili}`, { timeout: 5000 })
  console.log('jilli 驗證成功：已登入')
}catch(err){
  console.error('jili 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
}

await tools.checkAndNotify({ page:jiliPage,groupChatId: groupChatId })

const researchIntervalMs = process.env.RESEARCH_INTERVAL_MS || config.RESEARCH_INTERVAL_MS

while (true) {
  await tools.sleep(researchIntervalMs)

  try {
    await tools.reSearch(jiliPage)
    await tools.checkAndNotify({ page:jiliPage,groupChatId: groupChatId })
  } catch (err) {
    console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
  }
}
