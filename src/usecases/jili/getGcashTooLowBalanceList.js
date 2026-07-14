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
  const rows = await tools.getBalanceList({ page })
  const totalSummaryRow = rows.pop()

  const lowBalanceList = tools.balanceListFilter({
    balanceList: rows,
    lessAmount,
  })

  const sortedLowBalanceList = tools.getAttayAscendingSort({
    array: lowBalanceList,
    key: 'balance',
  })

  const formattedLowBalanceList = sortedLowBalanceList.map(item => {
    return {
      ...item,
      balance: tools.formatAmountWithCommas(item.balance),
    }
  })
  const formattedTotalSummaryRow = {
    ...totalSummaryRow,
    balance: tools.formatAmountWithCommas(totalSummaryRow.balance),
  }

  const result = [...formattedLowBalanceList, formattedTotalSummaryRow]

  return result
}

export default getGcashTooLowBalanceList
