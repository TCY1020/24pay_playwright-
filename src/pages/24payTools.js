const toolBy24pay = {
  async openSideMenu({ page, mainMenuId, subMenuId }) {
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
  },
}

export default toolBy24pay
