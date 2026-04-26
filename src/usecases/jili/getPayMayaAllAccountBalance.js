import map from '../../../map.js'

const getPayMayaAllAccountBalance = async ({ tools, page }) => {
  const selectMap = map.selectMap
  await tools.selectState({
    page: page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN
  })
  await tools.selectChannelName({ page: page, channelName: 'PayMaya' })
  await tools.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })
  await tools.refreshAndWaitForBalanceTable({ page: page })
  const balanceList = await tools.getBalanceList({ page: page })

  return balanceList.find(item => item.name === '總共')
}

export default getPayMayaAllAccountBalance
