import { getConfig } from '../../../config.js'
import toolBy24pay from '../../pages/24payTools.js'

const config = getConfig()
const PAYMENT_STATS_PAGE = config.PAYMENT_STATS_PAGE

const paymentOrderStats = {
  async getTodayPaymentOrderStats({ page }) {
    await toolBy24pay.openTab({ page, targetId: PAYMENT_STATS_PAGE.subMenuId })
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
  },
  async setPaymentOrderStatsMenuFilter({ page, startDate, endDate }) {
    await toolBy24pay.openTab({ page, targetId: PAYMENT_STATS_PAGE.subMenuId })

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
  },
  async submitPaymentOrderStats({ page }) {
    await toolBy24pay.openTab({ page, targetId: PAYMENT_STATS_PAGE.subMenuId })

    const submitButton = page
      .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
      .locator('#submitSearch')
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()
  },
  async clickPaymentDownArrowKey({ page }) {
    await toolBy24pay.openTab({ page, targetId: PAYMENT_STATS_PAGE.subMenuId })
    const downArrowKey = page
      .frameLocator(`iframe[tab-id="${PAYMENT_STATS_PAGE.subMenuId}"]`)
      .locator('tbody i.layui-icon.layui-icon-right')
    await downArrowKey.waitFor({ state: 'visible', timeout: 10000 })
    await downArrowKey.click()
  },
  sortMerchantBySuccessAmount({ todayPaymentOrderStats }) {
    let merchantList = todayPaymentOrderStats[0].merchantList
    merchantList = merchantList.sort((a, b) => b.OrderSuccessAmount - a.OrderSuccessAmount)
    todayPaymentOrderStats[0].merchantList = merchantList

    return todayPaymentOrderStats
  },
}

export default paymentOrderStats