class Tools {
  constructor({ config }) {
    // 如果有需要初始化的高頻變數可以放這裡
    this.config = config
  }

  login = async ({ page, backstage = "jili", account }) => {
    let url
    console.log(backstage)

    if (backstage === 'jili') {
      url = 'https://ptrcqps9.2424ph.com/#/login'
      account = this.config.ACCOUNT_JILI
    }
    await page.goto(url)
    console.log('請手動登入')

    await page.waitForSelector(`text=${account}`, { timeout: 300000 })
    console.log(`${backstage} 登入成功`)
  }

  gotoUrl = async ({ page, url }) => {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })

    // ✅ 確認 URL（如果會變）
    const isLogin = await page.locator('text=2405a').isVisible().catch(() => false)

    if (!isLogin) {
      throw new Error('❌ 未登入（auth.json 失效）')
    }
  }

  selectState = async ({ page, stateIndex, option }) => {
    const stateEl = page.locator('.sc-select-filter__item-options').nth(stateIndex)
    await stateEl.locator('li', { hasText: option }).click()
  }

  selectChannelName = async ({ page, channelName }) => {
    const channelRegex = new RegExp(`^${channelName}$`)
    await page.locator('.el-select').nth(0).click()
    const chooseBankEl = page.locator('.el-scrollbar__view.el-select-dropdown__list').nth(0)
    await chooseBankEl.locator('.el-select-dropdown__item', { hasText: channelRegex }).click()
  }

  selectPageSize = async ({ page, pageSizeIndex }) => {
    const wrappers = page.locator('.el-input__wrapper')
    const targetInput = wrappers.locator('input[placeholder="请选择"]').nth(2)
    await targetInput.waitFor({ state: 'visible' })
    await targetInput.click()
    await page.locator('.el-select-dropdown__item', { hasText: pageSizeIndex }).click()
  }

  refreshAndWaitForBalanceTable = async ({ page }) => {
    const rows = page.locator('tbody tr')
  
    // 👉 先記錄舊資料（整列，比只看一個欄位更準）
    const beforeList = await rows.evaluateAll(rows =>
      rows.map(row => row.innerText),
    )
  
    // 👉 點刷新
    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
  
    // 👉 等 loading 消失（如果有）
    await page.locator('.el-loading-mask').waitFor({ state: 'hidden' }).catch(() => {})
  
    // 👉 等資料變化
    await page.waitForFunction(
      (oldList) => {
        const newList = Array.from(document.querySelectorAll('tbody tr'))
          .map(row => row.innerText)
  
        // 沒資料就繼續等
        if (!newList.length) return false
  
        return JSON.stringify(newList) !== JSON.stringify(oldList)
      },
      beforeList,
      { timeout: 10000 },
    )
  }

  getBalanceList = async ({ page }) => {
    const result = await page.$$eval(
      'tbody tr', rows => {
        return rows
          .map(row => {
            const getText = (selector) =>
              row.querySelector(selector)?.innerText?.trim()
            // 對應欄位
            let name = getText('.el-table_1_column_5 .cell') // MB114
            let balanceText = getText('.el-table_1_column_6.el-table__cell') // 1000
            let accountId = getText('.el-table_1_column_9 .cell span') // 電話
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
  }

  reSearch = async (page) => {
    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
    await page.waitForTimeout(2000)
  }

  balanceListFilter = ({ balanceList, lessAmount }) => {
    const filtered = balanceList.filter(item => {
      return item.name === '總共' || item.balance < lessAmount
    })

    return filtered
  }

  getMaxPage = async({ page }) => {
    const pagerItems = page.locator('.el-pager li.number')
    await page.waitForTimeout(5000)

    const numbers = await pagerItems.allTextContents()

    const max = Math.max(
      ...numbers.map(n => parseInt(n.trim(), 10)),
    )

    return max
  }

  chouseAllCheckBox = async({ page }) => {
    return await page.locator('.el-checkbox__input').nth(0).click()
  }

  waitSuccessMessage = async ({ page }) => {
    await page.locator('.el-message--success').waitFor({ timeout: 120000 })
    
    await page.waitForTimeout(3000)
  }

  clickBatchUpdatButton = async ({ page }) => {
    try {
      const btn = page.locator(
        'button.el-button--warning:not(.is-disabled)',
        { hasText: '更新' },
      )
  
      await btn.waitFor({ state: 'visible', timeout: 10000 })
  
      // 🔥 核心：點擊 + 等 loading
      await Promise.all([
        btn.click(),
        btn.locator('.el-loading-mask').waitFor({ state: 'detached' }).catch(() => {}),
      ])
  
      return true
    } catch (err) {
      console.log('❌ 更新按鈕點擊失敗', err)

      return false
    }
  }

  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  inputMerchantName = async ({ page, merchantName }) => {
    const merchantInput = page.locator('input[placeholder="商户名称"]')
    await merchantInput.waitFor({ state: 'visible' })
    const currentValue = await merchantInput.inputValue()
    if (currentValue.trim()) {
      await merchantInput.fill('')
    }
    await merchantInput.type(merchantName)
  }

  checkTrOnlyone = async({ page }) => {
    const trs = await page.locator('tbody tr')
    if (trs.count() === 1) {
      return true
    }

    return false
  }

  clickUpdateButton = async({ page }) => {
    await page.locator('.el-button.el-button--small.is-plain', { hasText: '更新' }).click()
  }
}

// 匯出實例化後的物件
export default Tools
