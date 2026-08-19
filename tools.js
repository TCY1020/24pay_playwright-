const UTC8_TIME_ZONE = 'Asia/Taipei'

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

  getUtc8Parts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: UTC8_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })

    const partList = formatter.formatToParts(date)
    const map = Object.fromEntries(partList.map(part => [part.type, part.value]))

    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    }
  },

  getDelayToNextReport({ reportHourList }) {
    const now = new Date()
    const utc8NowParts = this.getUtc8Parts(now)

    const utc8Now = Date.UTC(
      utc8NowParts.year,
      utc8NowParts.month - 1,
      utc8NowParts.day,
      utc8NowParts.hour,
      utc8NowParts.minute,
      utc8NowParts.second,
      now.getMilliseconds(),
    )

    let nextReportAtUtc8Ms = null
    for (const reportTime of reportHourList) {
      const [hourText, minuteText] = reportTime.split(':')
      const hour = Number(hourText)
      const minute = Number(minuteText)
      const candidate = Date.UTC(
        utc8NowParts.year,
        utc8NowParts.month - 1,
        utc8NowParts.day,
        hour,
        minute,
        0,
        0,
      )

      if (candidate > utc8Now) {
        nextReportAtUtc8Ms = candidate
        break
      }
    }

    if (!nextReportAtUtc8Ms) {
      const [firstHourText, firstMinuteText] = reportHourList[0].split(':')
      nextReportAtUtc8Ms = Date.UTC(
        utc8NowParts.year,
        utc8NowParts.month - 1,
        utc8NowParts.day + 1,
        Number(firstHourText),
        Number(firstMinuteText),
        0,
        0,
      )
    }

    return nextReportAtUtc8Ms - utc8Now
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
