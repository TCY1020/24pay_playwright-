import { getConfig } from '../../config.js'
const config = getConfig()
const REPORT_HOURS_UTC8 = config.REPORT_HOURS_UTC8
const TOP_MERCHANT_COUNT = config.TOP_MERCHANT_COUNT
const NOTIFY_USER_ID = config.NOTIFY_24PAY_SCHEDULED_REPORT_USER_ID
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

const getMerchantList = async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')

  const merchantIframe = page.locator('iframe[tab-id="nav_3"]').first()
  await merchantIframe.waitFor({ state: 'attached', timeout: 12000 })

  const frameHandle = await merchantIframe.elementHandle()
  const frame = await frameHandle?.contentFrame()

  if (!frame) {
    console.warn('[getMerchantList] 找不到商戶列表 iframe 內容')

    return []
  }

  const rows = frame.locator('div.layui-table-body.layui-table-main table > tbody > tr[data-index]')
  await rows.first().waitFor({ state: 'attached', timeout: 12000 })

  const rowCount = await rows.count()
  const merchantList = []

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i)
    const merchantNoCell = row.locator('td[data-field="MerchantNo"]').first()
    const balanceCell = row.locator('td[data-field="Balance"]').first()
    const merchantNoHtml = (await merchantNoCell.innerHTML()) ?? ''

    const merchantNoRaw =
      (await merchantNoCell.getAttribute('data-content')) ??
      (await merchantNoCell.innerText()) ??
      ''
    const balanceRaw =
      (await balanceCell.getAttribute('data-content')) ??
      (await balanceCell.innerText()) ??
      '0'

    const merchantNo = merchantNoRaw.trim()
    const balance = Number.parseFloat(balanceRaw.replace(/,/g, '').trim())

    if (!merchantNo) {
      continue
    }

    merchantList.push({
      merchantNo,
      balance: Number.isFinite(balance) ? balance : 0,
      isdev: merchantNoHtml.includes('对接中'),
    })
  }

  return merchantList
}

const submitMerchant = async ({ page }) => {
  const merchantTab = page.locator('ul#tabName > li[lay-id="nav_3"]').first()
  await merchantTab.waitFor({ state: 'visible', timeout: 12000 })
  await merchantTab.click()
  await page
    .locator('ul#tabName > li[lay-id="nav_3"].layui-this')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })

  const submitButton = page
    .frameLocator('iframe[tab-id="nav_3"]')
    .locator('#submitSearch')
  await submitButton.waitFor({ state: 'visible', timeout: 10000 })
  await submitButton.click()
}

const sortMerchantBalance = ({ merchantList, isDev = null }) => {
  let filteredMerchantList = merchantList

  if (isDev === true) {
    filteredMerchantList = merchantList.filter(merchant => merchant.isdev && merchant.merchantNo !== 'testno')
  } else if (isDev === false) {
    filteredMerchantList = merchantList.filter(merchant => !merchant.isdev && merchant.merchantNo !== 'testno')
  }else if(isDev === null) {
    filteredMerchantList = merchantList.filter(merchant => merchant.merchantNo !== 'testno')
  }


  return filteredMerchantList.sort((a, b) => b.balance - a.balance)
}

const getTopMerchantList = ({ merchantList, topCount = 5 }) => {
  return merchantList.slice(0, topCount)
}

const getTodayPaymentOrderStats = async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')

  const merchantIframe = page.locator('iframe[tab-id="nav_18"]').first()
  await merchantIframe.waitFor({ state: 'attached', timeout: 12000 })

  const frameHandle = await merchantIframe.elementHandle()
  const frame = await frameHandle?.contentFrame()

  if (!frame) {
    console.warn('[getTodayPaymentOrderStats] 找不到代收訂單統計 iframe 內容')

    return []
  }

  const rows = frame.locator('div.layui-table-body.layui-table-main table > tbody > tr[data-index]')
  await rows.first().waitFor({ state: 'attached', timeout: 12000 })

  const rowCount = await rows.count()
  const todayPaymentOrderStats = []

  const toNumber = value => {
    const parsed = Number.parseFloat(String(value ?? '').replace(/,/g, '').trim())

    return Number.isFinite(parsed) ? parsed : 0
  }

  for (let i = 0; i < rowCount; i += 1) {
    const row = rows.nth(i)

    const getFieldValue = async field => {
      const cell = row.locator(`td[data-field="${field}"]`).first()

      return (
        (await cell.getAttribute('data-content')) ??
        (await cell.innerText()) ??
        ''
      ).trim()
    }

    todayPaymentOrderStats.push({
      Date: await getFieldValue('Date'),
      MerchantNo: await getFieldValue('MerchantNo'),
      CompanyName: await getFieldValue('CompanyName'),
      TotalCount: toNumber(await getFieldValue('TotalCount')),
      OrderSuccessCount: toNumber(await getFieldValue('OrderSuccessCount')),
      SuccessRate: toNumber(await getFieldValue('SuccessRate')),
      OrderTotalAmount: toNumber(await getFieldValue('OrderTotalAmount')),
      OrderSuccessAmount: toNumber(await getFieldValue('OrderSuccessAmount')),
      OrderFailAmount: toNumber(await getFieldValue('OrderFailAmount')),
      OrderPayAmount: toNumber(await getFieldValue('OrderPayAmount')),
      OrderProfitAmount: toNumber(await getFieldValue('OrderProfitAmount')),
      ThirdPartyPayChannelType: await getFieldValue('ThirdPartyPayChannelType'),
      MerchantPayType: await getFieldValue('MerchantPayType'),
    })
  }

  return todayPaymentOrderStats
}

const submitTodayPaymentOrderStats = async ({ page }) => {
  const merchantTab = page.locator('ul#tabName > li[lay-id="nav_18"]').first()
  await merchantTab.waitFor({ state: 'visible', timeout: 12000 })
  await merchantTab.click()
  await page
    .locator('ul#tabName > li[lay-id="nav_18"].layui-this')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
  
  const submitButton = page
    .frameLocator('iframe[tab-id="nav_18"]')
    .locator('#submitSearch')
  await submitButton.waitFor({ state: 'visible', timeout: 10000 })
  await submitButton.click()
}

const format24payScheduledReport = ({ merchantList, todayPaymentOrderStats }) => {
  const nowParts = getUtc8Parts()
  const dateText = `${nowParts.month}/${nowParts.day} ${String(nowParts.hour).padStart(2, '0')}:${String(nowParts.minute).padStart(2, '0')}`

  const summaryRow =
    todayPaymentOrderStats.find(item => item.MerchantNo === '各商户汇总') ??
    todayPaymentOrderStats[0]
  const totalPayAmount = Number(summaryRow?.OrderPayAmount ?? 0)
  const formattedTotalPayAmount = Number.isFinite(totalPayAmount) ? totalPayAmount.toFixed(2) : '0.00'

  const topMerchantLines = merchantList.map(merchant => {
    const balance = Number(merchant.balance ?? 0)
    const formattedBalance = Number.isFinite(balance) ? balance.toFixed(2) : '0.00'

    return `${merchant.merchantNo}: ${formattedBalance}`
  })

  return [
    `${NOTIFY_USER_TEXT}
${dateText}總跑量 ${formattedTotalPayAmount}`,
    '',
    '前五家：',
    ...topMerchantLines,
  ].join('\n')
}

const start24payScheduledReportFlow = async ({ page, telegramTools, groupChatId }) => {
  // 開啟商戶列表
  await openPagination({ page, mainMenuId: '#nav_2', subMenuId: '#nav_3' })
  // 開啟代收訂單統計
  await openPagination({ page, mainMenuId: '#nav_19', subMenuId: '#nav_20' })

  // 設定下次執行時間
  const scheduleNext = () => {
    const delayMs = getDelayToNextReport()

    setTimeout(async () => {
      try {
        await submitMerchant({ page })
        await page.waitForTimeout(3000)
        const merchantList = await getMerchantList({ page })
        const sortedMerchantList = sortMerchantBalance({ merchantList, isDev: false })
        const topMerchantList = getTopMerchantList({ merchantList: sortedMerchantList, topCount: TOP_MERCHANT_COUNT })
        await submitTodayPaymentOrderStats({ page })
        await page.waitForTimeout(3000)
        const todayPaymentOrderStats = await getTodayPaymentOrderStats({ page })
        const text = format24payScheduledReport({ merchantList: topMerchantList, todayPaymentOrderStats })
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