const toolBy24pay = {
  async openSideMenu({ page, mainMenuId, subMenuId }) {
    const mainMenu = page.locator(mainMenuId)
    await mainMenu.waitFor({ state: 'visible', timeout: 15000 })

    const subMenuContainer = mainMenu.locator(':scope > ul.sub-menu')
    const isExpanded = await subMenuContainer.isVisible().catch(() => false)
    if (!isExpanded) {
      await mainMenu.locator(':scope > a').click()
      await subMenuContainer.waitFor({ state: 'visible', timeout: 10000 })
    }

    const targetLink = page.locator(`${subMenuId} > a`)
    await targetLink.waitFor({ state: 'visible', timeout: 10000 })
    await targetLink.click()
  },

  async openThreeLevelSideMenu({ page, mainMenuId, subMenuId, thirdMenuId }) {
    const mainMenu = page.locator(mainMenuId)
    await mainMenu.waitFor({ state: 'visible', timeout: 15000 })

    const subMenuContainer = mainMenu.locator(':scope > ul.sub-menu')
    const isExpanded = await subMenuContainer.isVisible().catch(() => false)
    if (!isExpanded) {
      await mainMenu.locator(':scope > a').click()
      await subMenuContainer.waitFor({ state: 'visible', timeout: 10000 })
    }

    const subMenu = page.locator(subMenuId)
    const nestedSubMenuContainer = subMenu.locator(':scope > ul.sub-menu')
    const isNestedExpanded = await nestedSubMenuContainer.isVisible().catch(() => false)
    if (!isNestedExpanded) {
      await subMenu.locator(':scope > a').click()
      await nestedSubMenuContainer.waitFor({ state: 'visible', timeout: 10000 })
    }

    const thirdLink = page.locator(`${thirdMenuId} > a`)
    await thirdLink.waitFor({ state: 'visible', timeout: 10000 })
    await thirdLink.click()
  },

  async openTab({ page, targetId }) {
    const tab = page.locator(`ul#tabName > li[lay-id="${targetId}"]`).first()
    await tab.waitFor({ state: 'visible', timeout: 12000 })
    await tab.click()
    await page
      .locator(`ul#tabName > li[lay-id="${targetId}"].layui-this`)
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
  },
}

export default toolBy24pay
