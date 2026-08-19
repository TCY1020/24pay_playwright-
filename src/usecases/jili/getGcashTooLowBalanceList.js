import map from '../../../map.js'
import tools from '../../../tools.js'
import jiliTools from '../../pages/jiliTools.js'

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
  const rowList = await jiliTools.getBalanceList({ page })
  const totalSummaryRow = rowList.pop()

  const lowBalanceList = tools.filterBalanceList({
    balanceList: rowList,
    lessAmount,
  })

  const sortedLowBalanceList = tools.getAscendingSortList({
    itemList: lowBalanceList,
    key: 'balance',
  })

  const formattedLowBalanceList = sortedLowBalanceList.map(item => {
    return {
      ...item,
      balance: tools.formatAmountWithCommas({ amount: item.balance }),
    }
  })
  const formattedTotalSummaryRow = {
    ...totalSummaryRow,
    balance: tools.formatAmountWithCommas({ amount: totalSummaryRow.balance }),
  }

  const resultList = [...formattedLowBalanceList, formattedTotalSummaryRow]

  return resultList
}

export default getGcashTooLowBalanceList
