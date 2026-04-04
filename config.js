import fs from 'fs'
import path from 'path'

export const getConfig = () => {
  const configPath = path.join(process.cwd(), 'config.json')
  let config = {}
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (err) {
    console.error('[config] 讀取 config.json 失敗', err?.message)
  }

  return config
}
