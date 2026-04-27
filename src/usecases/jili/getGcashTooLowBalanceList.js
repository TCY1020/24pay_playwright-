import map from '../../../map.js'

const getGcashTooLowBalanceList = async ({ tools, page, lessAmount }) => {
  const selectMap = map.selectMap
  await tools.selectState({
    page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN,
  })
  await tools.selectChannelName({ page, channelName: 'GcashWap' })
  await tools.selectPageSize({ page, pageSizeIndex: selectMap.pageSize[200] })

  await tools.refreshAndWaitForBalanceTable({ page })
  const gcashBalanceList = await tools.getBalanceList({ page })

  return tools.balanceListFilter({
    balanceList: gcashBalanceList,
    lessAmount,
  })
}

export default getGcashTooLowBalanceList
