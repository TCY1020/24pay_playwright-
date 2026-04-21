import map from './map.js'

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
      timeout: 60000
    })

    // ✅ 確認 URL（如果會變）
    console.log('當前URL:', page.url())
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

  refreshAndWaitForBalanceTable = async (page) => {
    const rows = page.locator('tbody tr')
  
    // 👉 先記錄舊資料（整列，比只看一個欄位更準）
    const beforeList = await rows.evaluateAll(rows =>
      rows.map(row => row.innerText)
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
      { timeout: 10000 }
    )
  }

  getBalanceList = async ({ page }) => {
    const result = await page.$$eval(
      'tbody tr', rows =>{
        return rows
         .map(row =>{
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
            balance:balanceText,
            accountId
          }
         })
         .filter(Boolean)
      }
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

  getGcashTooLowBalanceList = async ({ page, lessAmount }) => {
    const selectMap = map.selectMap
    await this.selectState({ page: page, stateIndex: selectMap.state.COLLECTION_STATUS, option: selectMap.stateText.OPEN })
    await this.selectChannelName({ page: page, channelName: 'GcashWap' })
    await this.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })
    
    await this.refreshAndWaitForBalanceTable(page)
    const gcashBalanceList = await this.getBalanceList({ page: page })
    const result = this.balanceListFilter({
      balanceList: gcashBalanceList,
      lessAmount: lessAmount,
    })

    return result
  }

  getNewPage = async({ context }) => {
    return context.newPage()
  }

  getMaxPage = async({ page }) => {
    const pagerItems = page.locator('.el-pager li.number')
    await page.waitForTimeout(5000)

    const numbers = await pagerItems.allTextContents()

    const max = Math.max(
      ...numbers.map(n => parseInt(n.trim(), 10))
    )

    return max
  }

  chouseAllCheckBox = async({page}) =>{
    return await page.locator('.el-checkbox__input').nth(0).click()
  }

  runChannelProcess = async ({ page, name }) => {
    const selectMap = map.selectMap
    await this.gotoUrl({
      page,
      url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account'
    })
  
    await this.selectChannelName({
      page,
      channelName: name
    })
  
    await this.selectState({
      page,
      stateIndex: selectMap.state.COLLECTION_STATUS,
      option: selectMap.stateText.OPEN
    })
  
    await this.reSearch(page)

    while (true) {
      await this.chouseAllCheckBox({ page })
      await this.pushUpdatButton({ page })
      const nextBtn = page.locator('.btn-next')
    
      const isDisabled = await nextBtn.getAttribute('aria-disabled')
      if (isDisabled === 'true') {
        break
      }
    
      await Promise.all([
        nextBtn.click(),
        page.locator('.el-pager li.is-active').waitFor()
      ])
    }

    await page.close()

    return name
  }

  pushUpdatButton = async ({ page }) => {
    try {
      const btn = page.locator(
        'button.el-button--warning:not(.is-disabled)',
        { hasText: '更新' }
      )
  
      await btn.waitFor({ state: 'visible', timeout: 10000 })
  
      // 🔥 核心：點擊 + 等 loading
      await Promise.all([
        btn.click(),
        btn.locator('.el-loading-mask').waitFor({ state: 'detached' }).catch(() => {})
      ])
  
      return true
    } catch (err) {
      console.log('❌ 更新按鈕點擊失敗', err)
      return false
    }
  }

  getPayMayaAllAccountBalance = async (page) => {
    const selectMap = map.selectMap
    await this.selectState({ page: page, stateIndex: selectMap.state.COLLECTION_STATUS, option: selectMap.stateText.OPEN })
    await this.selectChannelName({ page: page, channelName: 'PayMaya' })
    await this.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })
    await this.refreshAndWaitForBalanceTable(page)
    const balanceList = await this.getBalanceList({ page: page })

    const result = balanceList.filter(item => item.name === '總共')[0]

    return result
  }

  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  checkAndNotify = async ({ page }) => {
    const gcashLowBalanceThreshold = this.config.GCASH_LOW_BALANCE_THRESHOLD  
    // 1. 取得資料
    const lowAccountList = await this.getGcashTooLowBalanceList({ 
      page: page, 
      lessAmount: gcashLowBalanceThreshold 
    })
    const payMayaBalance = await this.getPayMayaAllAccountBalance(page)
  
    // 2. 格式化訊息
    const message = this.formatBalanceReport({
      lowList: lowAccountList,
      threshold: gcashLowBalanceThreshold,
      payMayaBalance: payMayaBalance.balance
    })

    return message
  }

  formatBalanceReport = ({ lowList, threshold, payMayaBalance }) => {
    const count = lowList.length
    const header = `Gcash低於 ${threshold} 的帳戶：(${count} 筆)`
    const footer = `\nPayMaya總餘: ${payMayaBalance}`
  
    let body = ''
    if (count > 0) {
      body = lowList.map((x) => {
        if(x.name ==='總共'){
          return `Gcash總餘: ${x.balance}`
        }else{
          return `- ${x.name} (${x.accountId}): ${x.balance}`
        }
      }).join('\n')
    }
  
    const result = [header, body, footer].filter(Boolean).join('\n')
  
    return result
  }
}

// 匯出實例化後的物件
export default Tools
