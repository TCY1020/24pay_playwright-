import { generate } from 'otplib'

const login24pay = async ({ page, config }) => {
  const secret = config.SECRET_24PAY
  const token = await generate({ secret })

  await page.goto('https://www.24pay.sbs/home/login')
  await page.locator('[name="Name"]').type(config.ACCOUNT_24PAY, { delay: 100 })
  await page.locator('[name="Password"]').type(config.PASSWORD_24PAY, { delay: 100 })
  await page.locator('[name="GoogleVerificationCode"]').type(token, { delay: 100 })
  await page.locator('.loginin').click()

  try {
    await page.waitForSelector(`text=${config.ACCOUNT_24PAY}`, { timeout: 5000 })
    console.log('24pay 驗證成功：已登入')
  } catch (err) {
    console.error('24pay 驗證失敗：找不到登入特徵，可能未登入或頁面加載過慢')
  }
}

export default login24pay
