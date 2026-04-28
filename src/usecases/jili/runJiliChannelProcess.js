import map from '../../../map.js'

const runJiliChannelProcess = async ({ tools, page, name, chatId, telegramTools, account }) => {
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
  while (true) {
    await tools.chouseAllCheckBox({ page })
    await tools.clickBatchUpdatButton({ page })
    const result = await tools.waitSubmitResultMessage({ page })
    if (result) {
      await telegramTools.sendGroupMessage({
        chatId,
        text: `通道(帐号): ${result} 更新失败,请手动刷新该通道的所有帐号`,
      })

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

  await page.close()

  return name
}

const runJiliMarchantNameProcess = async ({ tools, page, merchantList, chatId, telegramTools, account }) => {
  await tools.gotoUrl({
    page,
    url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
    account,
  })

  for (const merchant of merchantList) {
    await tools.inputMerchantName({ page, merchantName: merchant })
    await tools.refreshAndWaitForBalanceTable({ page })
    const isOnlyone = await tools.checkTrOnlyone({ page })
    if (isOnlyone) {
      break
    }
    await tools.clickUpdateButton({ page })
    const result = await tools.waitSubmitResultMessage({ page })
    if (result) {
      await telegramTools.sendGroupMessage({
        chatId,
        text: `新银归集(帐号): ${result} 更新失败,请手动刷新`,
      })
    }
  }
  await page.close()

  return merchantList
}

export { runJiliChannelProcess, runJiliMarchantNameProcess }
