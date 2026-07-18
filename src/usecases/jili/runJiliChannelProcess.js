import map from '../../../map.js'

const runJiliChannelProcess = async ({ tools, page, name, chatId, telegramTools, account }) => {
  try {
    const selectMap = map.selectMap
    await tools.gotoUrl({
      page,
      url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
      account,
    })

    await tools.selectChannelName({
      page,
      channelName: name,
    })

    await tools.selectState({
      page,
      stateIndex: selectMap.state.COLLECTION_STATUS,
      option: selectMap.stateText.OPEN,
    })

    await tools.reSearch(page)
    let status
    const cardCount = await tools.getChannelCardCount({ page })
    while (true) {
      await tools.chouseAllCheckBox({ page })
      await tools.clickBatchUpdatButton({ page })
      status = await tools.waitSubmitResultMessage({ page, name })
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

const runJiliMarchantNameProcess = async ({ tools, page, merchantList, chatId, telegramTools, account }) => {
  try {
    await tools.gotoUrl({
      page,
      url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
      account,
    })

    let rows = []
    for (const merchant of merchantList) {
      await tools.inputMerchantName({ page, merchantName: merchant })
      await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click()
      await tools.chouseAllCheckBox({ page })
      await tools.clickBatchUpdatButton({ page })
      const isOnlyone = await tools.checkTrOnlyone({ page })
      if (isOnlyone) {
        break
      }

      const result = await tools.waitSubmitResultMessage({ page, name: merchant })
      result.isMerchant = true
      rows.push(result)
    }

    return rows
  } finally {
    await page.close().catch(() => {})
  }
}

export { runJiliChannelProcess, runJiliMarchantNameProcess }
