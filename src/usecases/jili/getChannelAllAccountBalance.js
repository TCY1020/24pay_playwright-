import map from '../../../map.js'
import jiliTools from '../../pages/jiliTools.js'
import tools from '../../../tools.js'

const getChannelAllAccountBalance = async ({ page, channelName }) => {
  const selectMap = map.selectMap
  await jiliTools.selectState({
    page,
    stateIndex: selectMap.state.COLLECTION_STATUS,
    option: selectMap.stateText.OPEN,
  })
  await jiliTools.selectChannelName({ page, channelName })
  await jiliTools.selectPageSize({ page, pageSizeIndex: selectMap.pageSize[200] })
  await jiliTools.refreshAndWaitForBalanceTable({ page })
  const balanceList = await jiliTools.getBalanceList({ page })
  const totalSummaryRow = balanceList.find(item => item.name === '總共')

  let result = null

  if (!totalSummaryRow) {
    result = null
  } else {
    result = {
      ...totalSummaryRow,
      balance: tools.formatAmountWithCommas(totalSummaryRow.balance),
    }
  }

  return result
}

export default getChannelAllAccountBalance
