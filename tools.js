import telegramTools from './telegram.js'

const tools = {
    login: async (page) => {
        await page.goto('https://ptrcqps9.2424ph.com/#/login');
        console.log('頁面標題:', await page.title());
        console.log('請手動登入')

        await page.waitForSelector('.aminui-wrapper', { timeout: 300000 })
        console.log('登入成功')
    },
    gotoUrl: async (page, url) => {
        await page.goto(url);
        console.log('跳轉成功到頁面:', url);
    },

    selectGcashWap: async (page) => {
        //篩選
        // 代收狀態: 選擇 開啟
        const collectionStatusEl = page.locator('.sc-select-filter__item-options').nth(0)
        await collectionStatusEl.locator('li', { hasText: '开启' }).click()

        // 通道名稱: 選擇 GcashWap
        await page.locator('.el-select').nth(0).click()
        const chooseBankEl = page.locator('.el-scrollbar__view.el-select-dropdown__list').nth(0)
        await chooseBankEl.locator('.el-select-dropdown__item', { hasText: /^GcashWap$/ }).click()

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

    getGcashBalanceList: async (page)=>{
        const result = await page.$$eval('tbody tr', rows => {
            return rows
                .map(row => {
                const tds = row.querySelectorAll('td');
    
                let name = tds[2]?.innerText.trim();
                const balanceText = tds[3]?.innerText;
    
                if (name === '') {
                    name = '總共';
                } else if (!name || name.split('')[0] !== 'G') {
                    return null;
                }
    
                return {
                    name,
                    balance: Number(balanceText.replace(/[^0-9.-]/g, '')),
                };
                })
                .filter(item => item !== null);
            });
    
    
            console.log('總數:', result.length)
            console.log('全部的Gcash',result)
            
            return result
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
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    checkAndNotify: async({page, groupChatId}) =>{
        const gcashBalanceList = await tools.getGcashBalanceList(page)
        const gcashBalanceTooLowAccountList = tools.balanceListFilter({
            balanceList: gcashBalanceList,
            lessAmount: 3000,
          })
        
          let message
          if(gcashBalanceTooLowAccountList.length > 0){
            message = [
                `低於 3000 的帳戶：(${gcashBalanceTooLowAccountList.length} 筆)`,
                ...gcashBalanceTooLowAccountList.map((x) => `- ${x.name}: ${x.balance}`),
              ].join('\n');
          }else{
            message = `低於 3000 的帳戶：(0 筆)`
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