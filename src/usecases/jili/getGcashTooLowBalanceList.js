import map from '../../../map.js'

const getGcashTooLowBalanceList = async ({ tools, page, lessAmount }) => {
  const selectMap = map.selectMap
  await tools.selectState({
    page: page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN
  })
  await tools.selectChannelName({ page: page, channelName: 'GcashWap' })
  await tools.selectPageSize({ page: page, pageSizeIndex: selectMap.pageSize[200] })

  await tools.refreshAndWaitForBalanceTable({ page: page })
  const gcashBalanceList = await tools.getBalanceList({ page: page })

  return tools.balanceListFilter({
    balanceList: gcashBalanceList,
    lessAmount: lessAmount
  })
}

export default getGcashTooLowBalanceList
