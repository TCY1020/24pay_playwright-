import { getConfig } from '../../../config.js'
import tools from '../../../tools.js'
import toolBy24pay from '../../pages/24payTools.js'
const config = getConfig()
const PHILIPPINE_PAYMENT_PAGE = config.PHILIPPINE_PAYMENT_PAGE

const philippinePayment = {
  async setTimeFilter({ page, startDate, endDate }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const startDateInput = page
      .frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
      .locator('input[placeholder="开始时间"]')
    await startDateInput.waitFor({ state: 'visible', timeout: 10000 })
    await startDateInput.fill(startDate)

    const endDateInput = page
      .frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
      .locator('input[placeholder="结束时间"]')
    await endDateInput.waitFor({ state: 'visible', timeout: 10000 })
    await endDateInput.fill(endDate)
  },

  async setMerchantNo({ page, merchantNo }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const frame = page.frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
    const merchantSelect = frame.locator('#merchantId + .layui-form-select')
    await merchantSelect.locator('.layui-select-title').click()

    const option = merchantSelect.locator(`dd[lay-value="${merchantNo}"]`)
    await option.waitFor({ state: 'visible', timeout: 10000 })
    await option.click()
  },

  async setMerchantPayType({ page, merchantPayType }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const frame = page.frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
    const payTypeSelect = frame.locator('select[name="MerchantPayType"] + .layui-form-select')
    await payTypeSelect.locator('input').click()

    const option = payTypeSelect.locator(`dd[lay-value="${merchantPayType}"]`)
    await option.waitFor({ state: 'visible', timeout: 10000 })
    await option.click()
  },

  async setOrderStatus({ page, orderStatus }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const frame = page.frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
    const statusSelect = frame.locator('select[name="Status"] + .layui-form-select')
    await statusSelect.locator('input').click()

    const option = statusSelect.locator(`dd[lay-value="${orderStatus}"]`)
    await option.waitFor({ state: 'visible', timeout: 10000 })
    await option.click()
  },

  async submitSearch({ page }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })

    const submitButton = page
      .frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)
      .locator('.layui-btn-container > button[type="button"]')
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()
  },

  async getPayment ({ page }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const frame = page.frameLocator(`iframe[tab-id="${PHILIPPINE_PAYMENT_PAGE.thirdMenuId}"]`)

    const payAmountSpan = frame
      .locator('.layui-table-total > table > tbody > tr')
      .nth(1)
      .locator('td[data-field="PayAmount"] span')
    const paymentText = (await payAmountSpan.count()) > 0
      ? await payAmountSpan.innerText()
      : 0
    const payment = Number.parseFloat(String(paymentText).replace(/,/g, '').trim())

    return tools.formatAmountWithCommas(payment)
  },

  async getMerchantPayTypePayment ({ page, merchantNo, merchantPayTypeList, orderStatus, startDate, endDate }) {
    await toolBy24pay.openTab({ page, targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })
    const merchantPayTypePayment = {}
    await this.setTimeFilter({ page, startDate, endDate })
    await this.setMerchantNo({ page, merchantNo })
    await this.setOrderStatus({ page, orderStatus })
    merchantPayTypePayment['merchantNo'] = merchantNo
    for (const merchantPayType of merchantPayTypeList) {
      await this.setMerchantPayType({ page, merchantPayType })
      await this.submitSearch({ page })
      await page.waitForTimeout(2000)
      const payment = await this.getPayment({ page })
      merchantPayTypePayment[merchantPayType] = payment
    }

    return merchantPayTypePayment
  },
}

export default philippinePayment