import { chromium } from 'playwright'
import Tools from './tools.js'
import TelegramTools from './telegram.js'
import { generate } from 'otplib'
import path from 'path'
import fs from 'fs'
import { getConfig } from './config.js'


// =====================
// 🔧 載入設定檔（config.json fallback to .env）
// =====================
const config = getConfig()

const tools = new Tools({ config: config })
const telegramTools = new TelegramTools({ token: config.TELEGRAM_BOT_TOKEN })

telegramTools.startPolling()

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

const groupChatId = config.TELEGRAM_GROUP_CHAT_ID

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
try {
  await _24payPage.waitForSelector(`text=${config.ACCOUNT_24PAY}`, { timeout: 5000 })
  console.log('24pay 驗證成功：已登入')
} catch (err) {
  console.error('24pay 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
}

_24payPage.on('websocket', async ws => {
  ws.on('framereceived',async frame => {
    const data = frame.payload
    let msg = data.replace(/\u001e/g, '')
    msg = JSON.parse(msg)
    if (msg.type === 1) {
      const message = msg.arguments[0]
      await telegramTools.sendGroupMessage(groupChatId, message)
    }
  })
})

// VM / 無桌面環境：固定無頭，不在本機開視窗。
// 吉利部分 
const jiliContext = await browser.newContext({ storageState: authJsonPathJili })
const jiliPage = await jiliContext.newPage()
await tools.gotoUrl({ page: jiliPage, url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account' })
try {
  await jiliPage.waitForSelector(`text=${config.ACCOUNT_JILI}`, { timeout: 5000 })
  console.log('jilli 驗證成功：已登入')
} catch (err) {
  console.error('jili 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
}

const channelNameList = config.REFRESH_CHANNEL_NAME_LIST
telegramTools.onMessage(async msg => {
  const chatId = msg.chat.id

  if (msg.text === '/start') {
    const refreshPage = {}
    for(const name of channelNameList){
      refreshPage[name] = await tools.getNewPage({ context: jiliContext })
    }

    const resultList = await Promise.all(
      channelNameList.map(name =>
        tools.runChannelProcess({
          page: refreshPage[name],
          name
        })
      )
    )

    telegramTools.sendGroupMessage(
      chatId,
      `${resultList.join(', ')} >>> 皆已刷新完成`
    )
  }
})

let message
message = await tools.checkAndNotify({ page: jiliPage })
await telegramTools.sendGroupMessage(groupChatId, message)

const researchIntervalMs = config.RESEARCH_INTERVAL_MS

while (true) {
  await tools.sleep(researchIntervalMs)

  try {
    await tools.reSearch(jiliPage)
    message =await tools.checkAndNotify({ page: jiliPage })
    await telegramTools.sendGroupMessage(groupChatId, message)
  } catch (err) {
    console.error('[流程] 重新搜尋或通知失敗:', err?.message ?? err)
  }
}
