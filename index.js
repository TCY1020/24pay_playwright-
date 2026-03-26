import { chromium } from 'playwright';
import tools from './tools.js';


const browser = await chromium.launch({ headless: false });
let page = await browser.newPage();
await tools.login(page)
await tools.gotoUrl(page, 'https://ptrcqps9.2424ph.com/#/user_system/user_account')
await tools.selectGcashWap(page)
const gcashBalanceList = await tools.getGcashBalanceList(page)
const gcashBalanceTooLowAccountList = tools.balanceListFilter({balanceList:gcashBalanceList, lessAmount: 4000})
console.log(gcashBalanceTooLowAccountList)
