import { getConfig } from './config.js'
import startLowBalanceAlertFlow from './src/flows/lowbalanceAlert.js'
import { BrowserTools } from './src/infra/browser.js'
import checkJiliLoginPage from './src/pages/jiliLoginPage.js'
import ensureJiliAuthState from './src/usecases/jili/ensureJiliAuthState.js'
import registerTelegramCommands from './telegram/registerTelegramCommands.js'
import TelegramTools from './telegram/telegram.js'
import tools from './tools.js'
import merchantPaymentAmountNotif from './src/flows/merchantPaymentAmountNotif.js'

// 1) 基礎設定與共用工具初始化
const config = getConfig()
const telegramTools = new TelegramTools({ token: config.TELEGRAM_BOT_TOKEN })

// 2) 啟動 Telegram polling（後續 flow 會註冊訊息事件）
telegramTools.startPolling()

// 2.1) Upstream 低餘額警報（不依賴 browser／登入）
startLowBalanceAlertFlow({
  tools,
  telegramTools,
  groupChatId: config.BALANCE_NOTIFICATION_GROUP_CHAT_ID,
  config,
})

// 3) 啟動前先驗證 jili 登入狀態檔是否存在
const authJsonPathJili = ensureJiliAuthState()

// 4) 共用 browser 實例（jili 使用獨立 context）
const browserTools = new BrowserTools({ headless: true })
const browser = await browserTools.launchBrowser()

// 5) jili：建立已登入 context 並確認登入狀態
const jiliContext = await browser.newContext({ storageState: authJsonPathJili })
const jiliPage = await jiliContext.newPage()
await checkJiliLoginPage({ page: jiliPage, config })

merchantPaymentAmountNotif({ jiliContext,telegramTools, config })

// 6) Telegram 指令：/start 批次刷新；/monitor_on|/monitor_off 控制餘額監控
registerTelegramCommands({
  telegramTools,
  config,
  jiliContext,
  jiliPage,
})
