import map from '../../../map.js'

const runJiliChannelProcess = async ({ tools, page, name }) => {
  const selectMap = map.selectMap
  await tools.gotoUrl({
    page,
    url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
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
    await tools.waitSuccessMessage({ page })
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

const runJiliMarchantNameProcess = async ({ tools, page, merchantList }) => {
  await tools.gotoUrl({
    page,
    url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account',
  })

  for (const merchant of merchantList) {
    await tools.inputMerchantName({ page, merchantName: merchant })
    await tools.refreshAndWaitForBalanceTable({ page })
    const isOnlyone = await tools.checkTrOnlyone({ page })
    if (isOnlyone) {
      break
    }
    await tools.clickUpdateButton({ page })
    await tools.waitSuccessMessage({ page })
  }
  await page.close()

  return merchantList
}

export { runJiliChannelProcess, runJiliMarchantNameProcess }
