import map from '../../../map.js'

const runJiliChannelProcess = async ({ tools, page, name }) => {
  const selectMap = map.selectMap
  await tools.gotoUrl({
    page: page,
    url: 'https://ptrcqps9.2424ph.com/#/user_system/user_account'
  })

  await tools.selectChannelName({
    page: page,
    channelName: name
  })

  await tools.selectState({
    page: page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN
  })

  await tools.reSearch(page)
  while (true) {
    await tools.chouseAllCheckBox({ page: page })
    await tools.pushUpdatButton({ page: page })
    await tools.waitSuccessMessage({ page: page })
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

export default runJiliChannelProcess
