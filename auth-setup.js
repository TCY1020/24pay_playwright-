/**
 * 在本機執行（需螢幕）：手動完成帳密與圖形驗證後，寫出 Playwright storageState。
 *
 *   npm run auth-save
 */
import { spawn } from 'node:child_process'

import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

import { getConfig } from './config.js'
import tools from './tools.js'

const config = getConfig()

function uploadAuthToGce(localPath) {
  const remote = `${config.GCLOUD_USER}@${config.GCLOUD_INSTANCE}:${config.GCLOUD_REMOTE_DIR}`
  console.log(`正在上傳 ${path.basename(localPath)} 至 GCE：${remote}`)

  return new Promise((resolve, reject) => {
    const child = spawn(
      'gcloud',
      ['compute', 'scp', localPath, remote, `--zone=${config.GCLOUD_ZONE}`],
      { stdio: 'inherit' },
    )
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`gcloud compute scp 失敗，結束碼 ${code}`))
    })
  })
}
const backstage = process.env.BACKSTAGE || 'jili'

const storageStatePath = path.resolve(
  process.cwd(),
  `${backstage}_auth.json`,
)
console.log(`將 ${backstage}_auth.json 儲存登入狀態至: ${storageStatePath}`)
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext()
const page = await context.newPage()
try {
  await tools.login({ page, backstage, config })
  await fs.promises.mkdir(path.dirname(storageStatePath), { recursive: true })
  await context.storageState({ path: storageStatePath })
  console.log('已寫入 storageState，可把此檔放到伺服器並以 HEADLESS=1 執行主程式。')

  await uploadAuthToGce(storageStatePath)
  console.log('已上傳至 GCE，可在伺服器上以 HEADLESS=1 執行主程式。')
} finally {
  await browser.close()
}