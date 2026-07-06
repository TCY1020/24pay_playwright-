import { getConfig } from '../../config.js'
const config = getConfig()
const REPORT_HOURS_UTC8 = config.REPORT_HOURS_UTC8
const NOTIFY_USER_ID = config.NOTIFY_24PAY_SCHEDULED_REPORT_USER_ID
const PAYMENT_STATS_PAGE = config.PAYMENT_STATS_PAGE
const UTC8_TIME_ZONE = 'Asia/Taipei'

const formatNotifyUser = userId => {
  const normalized = String(userId ?? '').trim()
  if (!normalized) return ''

  return normalized.startsWith('@') ? normalized : `@${normalized}`
}

const NOTIFY_USER_TEXT = Array.isArray(NOTIFY_USER_ID)
  ? NOTIFY_USER_ID.map(formatNotifyUser).filter(Boolean).join(' ')
  : formatNotifyUser(NOTIFY_USER_ID)

const getUtc8Parts = (date = new Date()) => {
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
}

const getDelayToNextReport = () => {
  const now = new Date()
  const utc8NowParts = getUtc8Parts(now)

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
  for (const reportTime of REPORT_HOURS_UTC8) {
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
    const [firstHourText, firstMinuteText] = REPORT_HOURS_UTC8[0].split(':')
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
}

const openPagination = async ({ page, mainMenuId, subMenuId }) => {
  const mainMenu = page.locator(mainMenuId)
  await mainMenu.waitFor({ state: 'visible', timeout: 15000 })

  const subMenuContainer = mainMenu.locator('ul.sub-menu')
  const isExpanded = await subMenuContainer.isVisible().catch(() => false)
  if (!isExpanded) {
    await mainMenu.locator(':scope > a').click()
    await subMenuContainer.waitFor({ state: 'visible', timeout: 10000 })
  }

  const targetLink = page.locator(`${subMenuId} > a`)
  await targetLink.waitFor({ state: 'visible', timeout: 10000 })
  await targetLink.click()
}

const getTodayPaymentOrderStats = async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')

  const merchantIframe = page.locator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`).first()
  await merchantIframe.waitFor({ state: 'attached', timeout: 12000 })

  const frameHandle = await merchantIframe.elementHandle()
  const frame = await frameHandle?.contentFrame()

  if (!frame) {
    console.warn('[getTodayPaymentOrderStats] 找不到代收訂單統計 iframe 內容')

    return []
  }

  const mainTableBody = frame.locator('div.layui-table-body.layui-table-main table > tbody').first()
  const rows = mainTableBody.locator(':scope > tr[data-index]')
  await rows.first().waitFor({ state: 'attached', timeout: 12000 })

  const rowCount = await rows.count()
  const todayPaymentOrderStats = []

  const toNumber = value => {
    const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').trim())

    return Number.isFinite(parsed) ? parsed : 0
  }

  const getFieldValue = async ({ row, field }) => {
    const cell = row.locator(`td[data-field="${field}"]`).first()

    return (
      (await cell.getAttribute('data-content')) ??
      (await cell.innerText()) ??
      ''
    ).trim()
  }

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i)
    const detailRow = row
      .locator('xpath=following-sibling::tr[contains(@class, "noHover") and contains(@class, "childTr")][1]')
      .first()
    const detailRows = detailRow.locator('div.layui-table-body.layui-table-main table > tbody > tr[data-index]')
    const detailCount = await detailRows.count()
    const merchantList = []

    for (let j = 0; j < detailCount; j += 1) {
      const detailItem = detailRows.nth(j)

      merchantList.push({
        Date: await getFieldValue({ row: detailItem, field: 'Date' }),
        MerchantNo: await getFieldValue({ row: detailItem, field: 'MerchantNo' }),
        CompanyName: await getFieldValue({ row: detailItem, field: 'CompanyName' }),
        TotalCount: toNumber(await getFieldValue({ row: detailItem, field: 'TotalCount' })),
        OrderSuccessCount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderSuccessCount' })),
        SuccessRate: toNumber(await getFieldValue({ row: detailItem, field: 'SuccessRate' })),
        OrderTotalAmount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderTotalAmount' })),
        OrderSuccessAmount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderSuccessAmount' })),
        OrderFailAmount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderFailAmount' })),
        OrderPayAmount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderPayAmount' })),
        OrderProfitAmount: toNumber(await getFieldValue({ row: detailItem, field: 'OrderProfitAmount' })),
        ThirdPartyPayChannelType: await getFieldValue({ row: detailItem, field: 'ThirdPartyPayChannelType' }),
        MerchantPayType: await getFieldValue({ row: detailItem, field: 'MerchantPayType' }),
      })
    }

    todayPaymentOrderStats.push({
      Date: await getFieldValue({ row, field: 'Date' }),
      MerchantNo: await getFieldValue({ row, field: 'MerchantNo' }),
      CompanyName: await getFieldValue({ row, field: 'CompanyName' }),
      TotalCount: toNumber(await getFieldValue({ row, field: 'TotalCount' })),
      OrderSuccessCount: toNumber(await getFieldValue({ row, field: 'OrderSuccessCount' })),
      SuccessRate: toNumber(await getFieldValue({ row, field: 'SuccessRate' })),
      OrderTotalAmount: toNumber(await getFieldValue({ row, field: 'OrderTotalAmount' })),
      OrderSuccessAmount: toNumber(await getFieldValue({ row, field: 'OrderSuccessAmount' })),
      OrderFailAmount: toNumber(await getFieldValue({ row, field: 'OrderFailAmount' })),
      OrderPayAmount: toNumber(await getFieldValue({ row, field: 'OrderPayAmount' })),
      OrderProfitAmount: toNumber(await getFieldValue({ row, field: 'OrderProfitAmount' })),
      ThirdPartyPayChannelType: await getFieldValue({ row, field: 'ThirdPartyPayChannelType' }),
      MerchantPayType: await getFieldValue({ row, field: 'MerchantPayType' }),
      merchantList,
    })
  }

  return todayPaymentOrderStats
}

const openPaymentOrderStatsMenu = async ({ page }) => {
  const paymentStatsTab = page.locator(`ul#tabName > li[lay-id="${PAYMENT_STATS_PAGE.subMenuId}"]`).first()
  await paymentStatsTab.waitFor({ state: 'visible', timeout: 12000 })
  await paymentStatsTab.click()
  await page
    .locator(`ul#tabName > li[lay-id="${PAYMENT_STATS_PAGE.subMenuId}"].layui-this`)
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
}

const setPaymentOrderStatsMenuFilter = async ({ page, startDate, endDate }) => {
  await openPaymentOrderStatsMenu({ page })

  const startDateInput = page
  .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
  .locator('input[placeholder="开始时间"]')
  await startDateInput.waitFor({ state: 'visible', timeout: 10000 })
  await startDateInput.fill(startDate)

  const endDateInput = page
  .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
  .locator('input[placeholder="结束时间"]')
  await endDateInput.waitFor({ state: 'visible', timeout: 10000 })
  await endDateInput.fill(endDate)
}

const submitPaymentOrderStats = async ({ page }) => {
  await openPaymentOrderStatsMenu({ page })

  const submitButton = page
    .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
    .locator('#submitSearch')
  await submitButton.waitFor({ state: 'visible', timeout: 10000 })
  await submitButton.click()
}

const clickPaymentDownArrowKey = async ({ page }) => {
  const downArrowKey = page
  .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
  .locator('tbody i.layui-icon.layui-icon-right')
  await downArrowKey.waitFor({ state: 'visible', timeout: 10000 })
  await downArrowKey.click()
}

const format24payScheduledReport = ({ todayPaymentOrderStats }) => {
  const nowParts = getUtc8Parts()
  const dateText = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`

  const summaryRow =
    todayPaymentOrderStats.find(item => item.MerchantNo === '各商户汇总') ??
    todayPaymentOrderStats[0]
  const totalPayAmount = Number(summaryRow?.OrderPayAmount ?? 0)
  const formattedTotalPayAmount = Number.isFinite(totalPayAmount) ? totalPayAmount.toFixed(2) : '0.00'
  const topMerchantList = Array.isArray(summaryRow?.merchantList)
    ? summaryRow.merchantList.slice(0, 5)
    : []

  const topMerchantLines = topMerchantList.map(merchant => {
    const successAmount = Number(merchant?.OrderSuccessAmount ?? 0)
    const formattedSuccessAmount = Number.isFinite(successAmount) ? successAmount.toFixed(2) : '0.00'
    const merchantNo = String(merchant?.MerchantNo ?? '').trim()

    return `${merchantNo}: ${formattedSuccessAmount}`
  })

  const titleLine = `${dateText}總跑量 ${formattedTotalPayAmount}`
  const notifyHeader = NOTIFY_USER_TEXT ? `${NOTIFY_USER_TEXT}\n${titleLine}` : titleLine

  return [
    notifyHeader,
    '前五家：',
    ...topMerchantLines,
  ].join('\n')
}

const sortMerchantBySuccessAmount = ({ todayPaymentOrderStats }) => {
  let merchantList = todayPaymentOrderStats[0].merchantList
  merchantList = merchantList.sort((a, b) => b.OrderSuccessAmount - a.OrderSuccessAmount)
  todayPaymentOrderStats[0].merchantList = merchantList
  return todayPaymentOrderStats
}

const start24payScheduledReportFlow = async ({ page, telegramTools, groupChatId }) => {
  // 開啟代收訂單統計
  await openPagination({ page, mainMenuId: `#${PAYMENT_STATS_PAGE.mainMenuId}`, subMenuId: `#${PAYMENT_STATS_PAGE.subMenuId}` })

  // 設定下次執行時間
  const scheduleNext = () => {
    const delayMs = getDelayToNextReport()

    setTimeout(async () => {
      try {
        const nowParts = getUtc8Parts()
        const startDate = `${nowParts.year}-${nowParts.month}-${nowParts.day} 00:00:00`
        const endDate = `${nowParts.year}-${nowParts.month}-${nowParts.day} 23:59:59`
        await setPaymentOrderStatsMenuFilter({ page, startDate, endDate })
        await submitPaymentOrderStats({ page })
        await page.waitForTimeout(3000)
        await clickPaymentDownArrowKey({ page })
        const todayPaymentOrderStats = await getTodayPaymentOrderStats({ page })
        const sortedTodayPaymentOrderStats = sortMerchantBySuccessAmount({ todayPaymentOrderStats })
        const text = format24payScheduledReport({ todayPaymentOrderStats:sortedTodayPaymentOrderStats })
        await telegramTools.sendGroupMessage({ chatId: groupChatId, text })
      } catch (err) {
        console.error('[24pay scheduled report] 發送失敗:', err?.message ?? err)
      } finally {
        scheduleNext()
      }
    }, delayMs)
  }

  scheduleNext()
}

export default start24payScheduledReportFlow