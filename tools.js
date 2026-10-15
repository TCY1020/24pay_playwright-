const tools = {
  filterBalanceList({ balanceList, lessAmount }) {
    const filteredList = balanceList.filter(item => {
      return item.balance < lessAmount
    })

    return filteredList
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  getAscendingSortList({ itemList, key = null }) {
    if (key) {
      return [...itemList].sort((a, b) => Number(a[key]) - Number(b[key]))
    }

    return [...itemList].sort((a, b) => Number(a) - Number(b))
  },

  formatAmountWithCommas({ amount, maximumFractionDigits = 2 }) {
    const numericAmount = typeof amount === 'number'
      ? amount
      : Number(String(amount ?? '').replace(/,/g, ''))

    if (!Number.isFinite(numericAmount)) return 'N/A'

    return numericAmount.toLocaleString('en-US', {
      maximumFractionDigits,
    })
  },
}

export default tools

