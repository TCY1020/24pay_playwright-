import { generate } from 'otplib'

const tools = {
  login: async ({ page, backstage = 'jili', config }) => {
    console.log(backstage)

    let account
    if (backstage === 'jili') {
      account = config.ACCOUNT_JILI
      await page.goto(config.JILI_URL)
      const token = await generate({ secret: config.SECRET_JILI })
      await page.locator('[placeholder="用户名 / 手机 / 邮箱"]').type(config.ACCOUNT_JILI, { delay: 100 })
      await page.locator('[placeholder="请输入密码"]').type(config.PASSWORD_JILI, { delay: 100 })
      await page.locator('[placeholder="谷歌验证码,未设置不填写"]').type(token, { delay: 100 })
    }else if (backstage === 'admin') {
      account = config.ACCOUNT_JILI_ADMIN
      await page.goto(config.JILI_URL)
      const token = await generate({ secret: config.SECRET_JILI_ADMIN })
      await page.locator('[placeholder="用户名 / 手机 / 邮箱"]').type(config.ACCOUNT_JILI_ADMIN, { delay: 100 })
      await page.locator('[placeholder="请输入密码"]').type(config.PASSWORD_JILI_ADMIN, { delay: 100 })
      await page.locator('[placeholder="谷歌验证码,未设置不填写"]').type(token, { delay: 100 })
    }
    console.log('請手動登入')

    await page.waitForFunction(
      () => !window.location.hash.includes('/login'),
      { timeout: 300000 },
    )
    await page.locator('label', { hasText: account }).first().waitFor({
      state: 'visible',
      timeout: 5000,
    })
    console.log(`${backstage} 登入成功`)
  },

  gotoUrl: async ({ page, url, account = null }) => {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })

    if (account) {
      try {
        await page.locator(`text=${account}`).waitFor({ state: 'visible', timeout: 15000 })
      } catch {
        throw new Error('❌ 未登入（auth.json 失效）')
      }
    }
  },

  selectState: async ({ page, stateIndex, option }) => {
    const stateEl = page.locator('.sc-select-filter__item-options').nth(stateIndex)
    await stateEl.locator('li', { hasText: option }).click()
  },

  selectChannelName: async ({ page, channelName }) => {
    const channelRegex = new RegExp(`^${channelName}$`)
    await page.locator('.el-select').nth(0).click()
    const chooseBankEl = page.locator('.el-scrollbar__view.el-select-dropdown__list').nth(0)
    await chooseBankEl.locator('.el-select-dropdown__item', { hasText: channelRegex }).click()
  },

  selectPageSize: async ({ page, pageSizeIndex }) => {
    const wrappers = page.locator('.el-input__wrapper')
    const targetInput = wrappers.locator('input[placeholder="请选择"]').nth(2)
    await targetInput.waitFor({ state: 'visible' })
    await targetInput.click()
    await page.locator('.el-select-dropdown__item', { hasText: pageSizeIndex }).click()
  },

  refreshAndWaitForBalanceTable: async ({ page }) => {
    const rows = page.locator('tbody tr')

    const beforeList = await rows.evaluateAll(rows =>
      rows.map(row => row.innerText),
    )

    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()

    await page.locator('.el-loading-mask').waitFor({ state: 'hidden' }).catch(() => {})

    await page.waitForFunction(
      (oldList) => {
        const newList = Array.from(document.querySelectorAll('tbody tr'))
          .map(row => row.innerText)

        if (!newList.length) return false

        return JSON.stringify(newList) !== JSON.stringify(oldList)
      },
      beforeList,
      { timeout: 10000 },
    )
  },

  getBalanceList: async ({ page }) => {
    const result = await page.$$eval(
      'tbody tr', rows => {
        return rows
          .map(row => {
            const getText = (selector) =>
              row.querySelector(selector)?.innerText?.trim()
            let name = getText('.el-table_1_column_5 .cell')
            let balanceText = getText('.el-table_1_column_6.el-table__cell')
            let accountId = getText('.el-table_1_column_9 .cell span')
            if (name === undefined) return null
            if (name === '') name = '總共'

            return {
              name,
              balance: balanceText,
              accountId,
            }
          })
          .filter(Boolean)
      },
    )

    return result
  },

  reSearch: async (page) => {
    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
    await page.waitForTimeout(2000)
  },

  balanceListFilter: ({ balanceList, lessAmount }) => {
    const filtered = balanceList.filter(item => {
      return item.balance < lessAmount
    })

    return filtered
  },

  getMaxPage: async ({ page }) => {
    const pagerItems = page.locator('.el-pager li.number')
    await page.waitForTimeout(5000)

    const numbers = await pagerItems.allTextContents()

    const max = Math.max(
      ...numbers.map(n => parseInt(n.trim(), 10)),
    )

    return max
  },

  chouseAllCheckBox: async ({ page }) => {
    return await page.locator('.el-checkbox__input').nth(0).click()
  },

  waitSubmitResultMessage: async ({ page, name }) => {
    try{
      const successEl = page.locator('.el-message--success')
      await successEl.waitFor({ timeout: 180000 }).then(() => 'success'),
  
      await page.waitForTimeout(3000)

      return {
        name,
        isMerchant: false,
        message: 'success',
      }
    }catch(err){
      err.message = {
        name,
        isMerchant: false,
        message: err.message,
      }

      return err.message
    }
  },

  clickBatchUpdatButton: async ({ page }) => {
    try {
      const btn = page.locator(
        'button.el-button--warning:not(.is-disabled)',
        { hasText: '更新' },
      )

      await btn.waitFor({ state: 'visible', timeout: 10000 })

      await Promise.all([
        btn.click(),
        btn.locator('.el-loading-mask').waitFor({ state: 'detached' }).catch(() => {}),
      ])

      return true
    } catch (err) {
      console.log('❌ 更新按鈕點擊失敗', err)

      return false
    }
  },

  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  inputMerchantName: async ({ page, merchantName }) => {
    const merchantInput = page.locator('input[placeholder="商户名称"]')
    await merchantInput.waitFor({ state: 'visible' })
    const currentValue = await merchantInput.inputValue()
    if (currentValue.trim()) {
      await merchantInput.fill('')
    }
    await merchantInput.type(merchantName)
  },

  checkTrOnlyone: async ({ page }) => {
    const trs = await page.locator('tbody tr')
    if (trs.count() === 1) {
      return true
    }

    return false
  },
  
  getAttayAscendingSort: ({ array, key = null }) => {
    let result = []
    if (key) {
      result = [...array].sort((a, b) => Number(a[key]) - Number(b[key]))
    } else {
      result = [...array].sort((a, b) => Number(a) - Number(b))
    }

    return result
  },
}

export default tools 
