import path from 'path'
import fs from 'fs'

const ensureJiliAuthState = () => {
  const authJsonPathJili = path.join(process.cwd(), 'jili_auth.json')
  const hasAuthJsonPathJili = fs.existsSync(authJsonPathJili)

  if (!hasAuthJsonPathJili) {
    console.error(`
    Jili憑證未找到\n
    請先在本機執行: npm run auth-setup，產生登入狀態後再執行 npm run dev`)
    process.exit(1)
  }

  return authJsonPathJili
}

export default ensureJiliAuthState
