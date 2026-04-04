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
      account = this.config.ACCOUNT_jili
    }
    await page.goto(url)
    console.log('請手動登入')

    await page.waitForSelector(`text=${account}`, { timeout: 300000 })
    console.log(`${backstage} 登入成功`)
  }

  gotoUrl = async ({ page, url }) => {
    await page.goto(url)
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

  checkBalancePageRefresh = async (page) => {
    const rows = page.locator('tbody tr')
    const beforeCount = await rows.count()
    const beforeFirstName = await rows.nth(0).locator('td').nth(2).innerText().catch(() => '')

    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()

    await page.waitForFunction(
      ({ beforeCount, beforeFirstName }) => {
        const rowEls = document.querySelectorAll('tbody tr')
        if (!rowEls || rowEls.length === 0) return false

        const firstRowTds = rowEls[0].querySelectorAll('td')
        const afterFirstName = (firstRowTds[2]?.innerText || '').trim()

        return rowEls.length !== beforeCount || afterFirstName !== beforeFirstName
      },
      { beforeCount: beforeCount, beforeFirstName: beforeFirstName }
    )
  }

  getBalanceList = async ({ page, accoutFirstWord = 'G' }) => {
    const result = await page.$$eval(
      'tbody tr',
      (rows, word) => {
        return rows
          .map(row => {
            const tds = row.querySelectorAll('td')
            if (tds.length < 4) return null

            let name = tds[2]?.innerText?.trim()
            let balanceText = tds[3]?.innerText?.trim()
            let accountId = tds[6]?.innerText?.trim()

            if (!balanceText) return null

            if (!name) {
              name = '總共'
            } else if (name[0] !== word) {
              return null
            }

            return {
              name: name,
              balance: Number(balanceText.replace(/[^0-9.-]/g, '')),
              accountId: accountId
            }
          })
          .filter(Boolean)
      },
      accoutFirstWord
    )

    return result
  }

  reSearch = async (page) => {
    await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
    await page.waitForTimeout(2000)
  }

  balanceListFilter = ({ balanceList, lessAmount }) => {
    const filtered = balanceList.filter(item => {
      return item.name !== '總共' && item.balance < lessAmount
    })

    return filtered
  }

  getGcashTooLowBalanceList = async ({ page, lessAmount }) => {
    const selectMap = map.selectMap
    await this.selectState({ page: page, stateIndex: selectMap.state.COLLECTION_STATUS, option: selectMap.stateText.OPEN })
    await this.selectChannelName({ page: page, channelName: 'GcashWap' })
    await this.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })

    await this.checkBalancePageRefresh(page)
    const gcashBalanceList = await this.getBalanceList({ page: page, accoutFirstWord: 'G' })
    const result = this.balanceListFilter({
      balanceList: gcashBalanceList,
      lessAmount: lessAmount,
    })

    return result
  }

  getPayMayaAllAccountBalance = async (page) => {
    const selectMap = map.selectMap
    await this.selectState({ page: page, stateIndex: selectMap.state.COLLECTION_STATUS, option: selectMap.stateText.OPEN })
    await this.selectChannelName({ page: page, channelName: 'PayMaya' })
    await this.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })
    await this.checkBalancePageRefresh(page)
    const balanceList = await this.getBalanceList({ page: page, accoutFirstWord: 'M' })

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
    const footer = `PayMaya總餘: ${payMayaBalance}`
  
    let body = ''
    if (count > 0) {
      body = lowList.map((x) => `- ${x.name} (${x.accountId}): ${x.balance}`).join('\n')
    }
  
    const result = [header, body, footer].filter(Boolean).join('\n')
  
    return result
  }
}

// 匯出實例化後的物件
export default Tools
