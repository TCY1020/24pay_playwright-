/**
 * 在本機執行（需螢幕）：手動完成帳密與圖形驗證後，寫出 Playwright storageState。
 *
 *   npm run auth-save
 *
 * 產生的檔案預設為 ./auth.json，請放到雲端並設定環境變數 PLAYWRIGHT_STORAGE_STATE（或沿用預設檔名）。
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import Tools from './tools.js'
import { getConfig } from './config.js'

const config = getConfig()
const tools = new Tools({ config: config })

const backstage = process.env.BACKSTAGE || 'jili'

const storageStatePath = path.resolve(
  process.cwd(),
   `${backstage}_auth.json`
)
console.log(`將 ${backstage}_auth.json 儲存登入狀態至: ${storageStatePath}`)
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()
try {
  await tools.login({ page: page,backstage: backstage })
  await fs.promises.mkdir(path.dirname(storageStatePath), { recursive: true })
  await context.storageState({ path: storageStatePath })
  console.log('已寫入 storageState，可把此檔放到伺服器並以 HEADLESS=1 執行主程式。')
} finally {
  await browser.close()
}