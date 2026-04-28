import { getConfig } from './config.js'
import start24payWsForwardFlow from './src/flows/24payWsForwardFlow.js'
import startJiliBalanceMonitorFlow from './src/flows/jiliBalanceMonitorFlow.js'
import registerJiliRefreshCommandFlow from './src/flows/jiliRefreshCommandFlow.js'
import { BrowserTools } from './src/infra/browser.js'
import login24pay from './src/pages/24payLoginPage.js'
import checkJiliLoginPage from './src/pages/jiliLoginPage.js'
import ensureJiliAuthState from './src/usecases/jili/ensureJiliAuthState.js'
import TelegramTools from './telegram.js'
import tools from './tools.js'


// 1) 基礎設定與共用工具初始化
const config = getConfig()
const telegramTools = new TelegramTools({ token: config.TELEGRAM_BOT_TOKEN })

// 2) 啟動 Telegram polling（後續 flow 會註冊訊息事件）
telegramTools.startPolling()

// 3) 啟動前先驗證 jili 登入狀態檔是否存在
const authJsonPathJili = ensureJiliAuthState()

const groupChatId = config.TELEGRAM_GROUP_CHAT_ID

// 4) 共用 browser 實例（24pay / jili 各自使用獨立 context）
const browserTools = new BrowserTools({ headless: true })
const browser = await browserTools.launchBrowser()

// 5) 24pay：登入 + 啟動 websocket 轉發流程
const _24payContext= await browser.newContext()
const _24payPage = await _24payContext.newPage()
await login24pay({ page: _24payPage, config })
start24payWsForwardFlow({ page: _24payPage, telegramTools, groupChatId, config })


// 6) jili：建立已登入 context 並確認登入狀態
const jiliContext = await browser.newContext({ storageState: authJsonPathJili })
const jiliPage = await jiliContext.newPage()
await checkJiliLoginPage({ page: jiliPage, config })

// 7) jili 指令流程：監聽 /start 觸發批次刷新
registerJiliRefreshCommandFlow({ 
  telegramTools,
  channelNameList: config.REFRESH_CHANNEL_NAME_LIST,
  merchantList: config.MERCHANT_LIST,
  account: config.ACCOUNT_JILI,
  jiliContext, 
  tools,
})

// 8) jili 監控流程：常駐輪詢餘額並發送通知
await startJiliBalanceMonitorFlow({ 
  tools,
  jiliPage,
  telegramTools,
  groupChatId,
  config, 
})
