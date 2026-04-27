import { chromium } from 'playwright'

export class BrowserTools {
  constructor({ headless = false } = {}) {
    this.headless = headless
  }

  async launchBrowser() {
    return chromium.launch({ headless: this.headless })
  }
}