const UTC8_TIME_ZONE = 'Asia/Taipei'

const tools = {
  balanceListFilter({ balanceList, lessAmount }) {
    const filtered = balanceList.filter(item => {
      return item.balance < lessAmount
    })

    return filtered
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  getAttayAscendingSort({ array, key = null }) {
    let result = []
    if (key) {
      result = [...array].sort((a, b) => Number(a[key]) - Number(b[key]))
    } else {
      result = [...array].sort((a, b) => Number(a) - Number(b))
    }

    return result
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

    const parts = formatter.formatToParts(date)
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]))

    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    }
  },

  getDelayToNextReport({ reportHoursUtc8 }) {
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
    for (const reportTime of reportHoursUtc8) {
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
      const [firstHourText, firstMinuteText] = reportHoursUtc8[0].split(':')
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

  formatAmountWithCommas(amount) {
    const numericAmount = typeof amount === 'number'
      ? amount
      : Number(String(amount ?? '').replace(/,/g, ''))

    if (!Number.isFinite(numericAmount)) return '0.00'

    return numericAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  },
}

export default tools
