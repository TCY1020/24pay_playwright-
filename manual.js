import { spawn } from 'node:child_process'

import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

import { getConfig } from './config.js'
import tools from './tools.js'

const config = getConfig()

const manual = {
  uploadAuthToGce: async (localPath) => {
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
  },

  uploadAuthJiliAuthToGce: async () => {
    const backstage = 'jili'
    const storageStatePath = path.resolve(
      process.cwd(),
      `${backstage}_auth.json`,
    )

    console.log(`將 ${backstage}_auth.json 儲存登入狀態至: ${storageStatePath}`)
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await tools.login({ page, backstage: 'jili', config })
      await fs.promises.mkdir(path.dirname(storageStatePath), { recursive: true })
      await context.storageState({ path: storageStatePath })
      console.log('已寫入 storageState，可把此檔放到伺服器並以 HEADLESS=1 執行主程式。')

      await manual.uploadAuthToGce(storageStatePath)
      console.log('已上傳至 GCE，可在伺服器上以 HEADLESS=1 執行主程式。')
    } finally {
      await browser.close()
    }
  },

  loginAdminJili: async () => {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await tools.login({ page, backstage: 'admin', config })
    } finally {
      await browser.close()
    }
  },
}

export default manual