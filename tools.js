import telegramTools from './telegram.js'
import fs from 'fs';
import path from 'path';

const tools = {
    login: async ({page, backstage = "jili", account}) => {
        let url
        console.log(backstage)
        const config = tools.getConfig()
        if (backstage === 'jili'){
            url = 'https://ptrcqps9.2424ph.com/#/login'
            account = config.ACCOUNT_jili
        }
        await page.goto(url);
        console.log('請手動登入');

        await page.waitForSelector(`text=${account}`, { timeout: 300000 })
        console.log(`${backstage} 登入成功`)
    },

    gotoUrl: async ({page, url}) => {
        await page.goto(url);
    },

    getConfig: () =>{
        const configPath = path.join(process.cwd(), 'config.json')
        let config = {}
        try{
            if(fs.existsSync(configPath)){
                config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            }
        }catch(err){
            console.error('[config] 讀取 config.json 失敗，改用 .env', err?.message)
        }

        return config
    },

    selectGcashWap: async ({page, channelName}) => {
        //篩選
        // 代收狀態: 選擇 開啟
        const collectionStatusEl = page.locator('.sc-select-filter__item-options').nth(0)
        await collectionStatusEl.locator('li', { hasText: '开启' }).click()

        channelName = new RegExp(`^${channelName}$`) 

        // 通道名稱: 選擇 GcashWap
        await page.locator('.el-select').nth(0).click()
        const chooseBankEl = page.locator('.el-scrollbar__view.el-select-dropdown__list').nth(0)
        await chooseBankEl.locator('.el-select-dropdown__item', { hasText: channelName }).click()

        // 一頁顯示量: 選擇 200條/頁
        const wrappers = page.locator('.el-input__wrapper');
        const targetInput = wrappers.locator('input[placeholder="请选择"]').nth(2);
        await targetInput.waitFor({ state: 'visible' })
        await targetInput.click()

        const popper = page.locator('li.el-select-dropdown__item')
        await popper.nth(9).click()
    },

    checkBalancePageRefresh: async(page) =>{
        // 搜尋前：先記錄表格狀態
        const rows = page.locator('tbody tr');
        const beforeCount = await rows.count();
        const beforeFirstName = await rows.nth(0).locator('td').nth(2).innerText().catch(() => '');

        // 點搜尋
        await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click();

        // 等待搜尋結果更新（列數或第一列名稱有變）
        await page.waitForFunction(
        ({ beforeCount, beforeFirstName }) => {
            const rowEls = document.querySelectorAll('tbody tr');
            if (!rowEls || rowEls.length === 0) return false;

            const firstRowTds = rowEls[0].querySelectorAll('td');
            const afterFirstName = (firstRowTds[2]?.innerText || '').trim();

            return rowEls.length !== beforeCount || afterFirstName !== beforeFirstName;
        },
        { beforeCount, beforeFirstName }
        );
    },

    getBalanceList: async ({ page, accoutFirstWord = 'G' }) => {
        const result = await page.$$eval(
            'tbody tr',
            (rows, accoutFirstWord) => {
                return rows
                    .map(row => {
                        const tds = row.querySelectorAll('td');
    
                        // ⭐ 防呆：欄位不夠直接跳過
                        if (tds.length < 4) return null;
    
                        let name = tds[2]?.innerText?.trim();
                        let balanceText = tds[3]?.innerText?.trim();
                        let accountId = tds[6]?.innerText?.trim()
    
                        // ⭐ 再防一次
                        if (!balanceText) return null;
    
                        if (!name) {
                            name = '總共';
                        } else if (name[0] !== accoutFirstWord) {
                            return null;
                        }
    
                        return {
                            name,
                            balance: Number(
                                balanceText.replace(/[^0-9.-]/g, '')
                            ),
                            accountId
                        };
                    })
                    .filter(Boolean); // ⭐ 更簡潔
            },
            accoutFirstWord
        );
    
        return result;
    },
    reSearch: async(page) => {
        await page.locator('.el-button.el-button--primary.el-button--default').nth(1).click();
        await page.waitForTimeout(2000);
    },

    balanceListFilter: ({balanceList, lessAmount}) => {
        balanceList = balanceList.filter(item =>{
           return item.name !== '總共' && item.balance < lessAmount
        })

        return balanceList
        
    },

    getGcashTooLowBalanceList: async ({page, lessAmount }) =>{
        await tools.selectGcashWap({page, channelName:'GcashWap'})
        await tools.checkBalancePageRefresh(page)
        const gcashBalanceList = await tools.getBalanceList({page, accoutFirstWord:'G'})
        const gcashBalanceTooLowAccountList = tools.balanceListFilter({
            balanceList: gcashBalanceList,
            lessAmount,
          })

          return gcashBalanceTooLowAccountList
    },

    getPayMayaAllAccountBalance: async (page) => {
        await tools.selectGcashWap({page, channelName:'PayMaya'})
        await tools.checkBalancePageRefresh(page)
        const balanceList = await tools.getBalanceList({page, accoutFirstWord:'M'})

        const payMayaAllAccountBalance = balanceList.filter(item => item.name === '總共')[0]

        return payMayaAllAccountBalance
    },

    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    checkAndNotify: async({page, groupChatId}) =>{
        const config = tools.getConfig()
        const gcashLowBalanceThreshold = config.GCASH_LOW_BALANCE_THRESHOLD
        const gcashBalanceTooLowAccountList = await tools.getGcashTooLowBalanceList({page, lessAmount: gcashLowBalanceThreshold})
        const payMayaAllAccountBalance = await tools.getPayMayaAllAccountBalance(page)
        
          let message
          if(gcashBalanceTooLowAccountList.length > 0){
            message = [
                `Gcash低於 ${gcashLowBalanceThreshold} 的帳戶：(${gcashBalanceTooLowAccountList.length} 筆)`,
                ...gcashBalanceTooLowAccountList.map((x) => `- ${x.name} (${x.accountId}): ${x.balance}`),
                `PayMaya總餘: ${payMayaAllAccountBalance.balance}`
              ].join('\n')
          }else{
            message = `Gcash低於 ${gcashLowBalanceThreshold} 的帳戶：(0 筆) \n PayMaya總餘: ${payMayaAllAccountBalance.balance}`
          }

          if(groupChatId){
            try {
                await telegramTools.sendGroupMessage(groupChatId, message);
              } catch (err) {
                console.error('[telegram] 傳送群組訊息失敗:', err?.message ?? err);
              }
          }
    }
} 

export default tools;