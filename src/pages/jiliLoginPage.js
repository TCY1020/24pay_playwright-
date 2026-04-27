const checkJiliLoginPage = async ({ page, config }) => {
  await page.goto('https://ptrcqps9.2424ph.com/#/user_system/user_account')
  try {
    await page.waitForSelector(`text=${config.ACCOUNT_JILI}`, { timeout: 5000 })
    console.log('jili 驗證成功：已登入')
  } catch (err) {
    console.error('jili 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
  }
}

export default checkJiliLoginPage