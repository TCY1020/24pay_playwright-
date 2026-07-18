import map from '../../../map.js'
import jiliTools from '../../pages/jiliTools.js'

const runJiliChannelProcess = async ({ page, name, chatId, telegramTools, account }) => {
  try {
    const selectMap = map.selectMap
    await jiliTools.goToUrl({
      page,
      url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
      account,
    })

    await jiliTools.selectChannelName({
      page,
      channelName: name,
    })

    await jiliTools.selectState({
      page,
      stateIndex: selectMap.state.COLLECTION_STATUS,
      option: selectMap.stateText.OPEN,
    })

    await jiliTools.reSearch(page)
    let status
    const cardCount = await jiliTools.getChannelCardCount({ page })
    while (true) {
      await jiliTools.chouseAllCheckBox({ page })
      await jiliTools.clickBatchUpdatButton({ page })
      status = await jiliTools.waitSubmitResultMessage({ page, name })
      if (status.message !== 'success') {
        break
      }

      const nextBtn = page.locator('.btn-next')

      const isDisabled = await nextBtn.getAttribute('aria-disabled')
      if (isDisabled === 'true') {
        break
      }

      await Promise.all([
        nextBtn.click(),
        page.locator('.el-pager li.is-active').waitFor(),
      ])
    }

    return {
      ...status,
      cardCount,
    }
  } finally {
    await page.close().catch(() => {})
  }
}

const runJiliMarchantNameProcess = async ({ page, merchantList, chatId, telegramTools, account }) => {
  try {
    await jiliTools.goToUrl({
      page,
      url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
      account,
    })

    let rows = []
    for (const merchant of merchantList) {
      await jiliTools.inputMerchantName({ page, merchantName: merchant })
      await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
      await jiliTools.chouseAllCheckBox({ page })
      await jiliTools.clickBatchUpdatButton({ page })
      const isOnlyone = await jiliTools.checkTrOnlyone({ page })
      if (isOnlyone) {
        break
      }

      const result = await jiliTools.waitSubmitResultMessage({ page, name: merchant })
      result.isMerchant = true
      rows.push(result)
    }

    return rows
  } finally {
    await page.close().catch(() => {})
  }
}

export { runJiliChannelProcess, runJiliMarchantNameProcess }
