import map from '../../../map.js'
import jiliTools from '../../pages/jiliTools.js'
import tools from '../../../tools.js'

const getGcashTooLowBalanceList = async ({ page, lessAmount }) => {
  const selectMap = map.selectMap
  await jiliTools.selectState({
    page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN,
  })
  await jiliTools.selectChannelName({ page, channelName: 'GcashWap' })
  await jiliTools.selectPageSize({ page, pageSizeIndex: selectMap.pageSize[200] })

  await jiliTools.refreshAndWaitForBalanceTable({ page })
  const rows = await jiliTools.getBalanceList({ page })
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
