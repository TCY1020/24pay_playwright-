---
name: 24pay-playwright
description: >-
  24pay Playwright 常駐服務：Jili 後台餘額監控（/monitor_on|/monitor_off）與 /start
  批次刷新、商戶跑量定時通知，並彙整 Upstream（FastPay／TGPay／L7Pay）餘額與低／高水位循環警報。
  使用於修改此 repo、除錯 Playwright 流程、Telegram 通知、config.json 或 auth 狀態檔相關工作時。
---

# 24pay Playwright 專案

Node.js（ES modules）+ Playwright + `node-telegram-bot-api` + `otplib`。主程式常駐執行三條線：**Jili 後台**（storageState 登入 + Telegram 指令驅動的批次刷新／餘額監控）、**商戶跑量定時通知**（成員統計頁依 UTC+8 報表時段排程），以及 **Upstream API**（FastPay／FastPay 黑名單／TGPay／L7Pay）餘額彙整與低／高水位循環警報。

## 目錄與責任

| 路徑 | 用途 |
|------|------|
| `index.js` | 主程式入口：組裝 config／Telegram／`BrowserTools`、啟動低餘額警報、以 `jili_auth.json` 建 jili context、啟動商戶跑量通知、註冊 Telegram 指令 |
| `config.js` | 自專案根目錄讀取 `config.json`（`getConfig()`） |
| `config.json` | 機密與業務參數（勿提交版本庫；勿在對話中貼實際 token／密碼） |
| `manual.js` | 手動登入工具：`uploadAuthJiliAuthToGce()` 產生並上傳 `jili_auth.json`，`loginAdminJili()` 驗證 admin 登入 |
| `daily-manual.js` | 每日手動流程入口：先刷新並上傳 jili auth，再執行 admin 登入檢查 |
| `tools.js` | 共用工具（無 page）：`sleep`、`filterBalanceList`、`getAscendingSortList`、`getUtc8Parts`、`getDelayToNextReport`、`formatAmountWithCommas({ amount, maximumFractionDigits = 2 })` |
| `sing.js` | Upstream 簽章：`sing.fastPay({ params, key })`（排除空值／`sign` 後排序組字串，MD5 小寫 hex） |
| `upstreamApi.js` | Upstream HTTP：`getFastPayBalance`、`getTgPayBalance`、`getL7PayBalance`（僅打 API，不含簽章／業務組裝） |
| `telegram/telegram.js` | `TelegramTools`：polling、`onMessage`、`sendGroupMessage` |
| `telegram/messageFormat.js` | **所有** Telegram 業務文案集中處（見下方「Telegram 文案」）；**對外文案統一簡體中文** |
| `telegram/registerTelegramCommands.js` | Telegram 指令註冊（`/start`、`/monitor_on`、`/monitor_off`、`/help`）；指令狀態回覆字串寫在此檔（簡體）；執行時仍依賴 `jiliContext`／`jiliPage` |
| `src/infra/browser.js` | `BrowserTools`：`chromium.launch`（建構參數 `headless`，`index.js` 預設 `true`） |
| `src/pages/` | 站台頁面操作：`jiliLoginPage.js`、`jiliTools.js`（`jiliTools`：登入／導頁／通道選擇／餘額表／批次更新／成員統計表／日期區間／`getChannelCardCount` 等） |
| `src/flows/` | `balanceMonitorFlow`、`refreshCommandFlow`、`lowbalanceAlert`、`merchantPaymentAmountNotif` |
| `src/usecases/jili/` | Jili 可重用邏輯：餘額查詢（含可選的低餘額篩選 usecase）、`runJiliChannelProcess`／`runJiliMarchantNameProcess`、auth 狀態檢查等 |
| `src/usecases/upstream/` | Upstream 組裝：`getUpstreamBalances`（簽章 + 打四家 API，回傳原始 JSON） |

## 指令

```bash
npm install
npm run daily-manual # 本機 headed：刷新 jili_auth.json 並上傳，再驗證 admin 登入
npm run dev          # 啟動 index.js（headless browser）
```

- 主程式要求專案根目錄存在 **`jili_auth.json`**，否則 `ensureJiliAuthState` 會 `process.exit(1)` 並提示先跑 `daily-manual` 產生最新狀態檔。
- 登入成功判斷已改為「離開登入頁 + `label` 文字包含帳號」的雙條件檢查。

## 主程式啟動（`index.js`）

依序：

1. `getConfig()` + `TelegramTools`，並 `startPolling()`。
2. `startLowBalanceAlertFlow({ tools, telegramTools, groupChatId, config })`（**不** `await`，不依賴 browser／登入，polling 啟動後立即開跑）。
3. `ensureJiliAuthState()` 確認 `jili_auth.json` 存在。
4. `new BrowserTools({ headless: true })` → `launchBrowser()`。
5. jili：以 `storageState: jili_auth.json` 建 context → `checkJiliLoginPage`。
6. `merchantPaymentAmountNotif({ jiliContext, telegramTools, config })`（**不** `await`；另開 page，依 `REPORT_HOURS_UTC8_LIST` 排程）。
7. `registerTelegramCommands({ telegramTools, config, jiliContext, jiliPage })`。

## `config.json` 鍵（僅列名稱）

實際值由部署環境提供；修改程式時對照 `index.js` 與各 flow 取用欄位即可。**勿在對話／skill 範例中貼實際密鑰。**

目前主程式會用到：

- `TELEGRAM_BOT_TOKEN`、`BALANCE_NOTIFICATION_GROUP_CHAT_ID`
- `RESEARCH_INTERVAL_MS`（餘額監控輪詢間隔）
- `LOW_BALANCE_ALERT_INTERVAL_MS`（低餘額警報輪詢間隔，預設 5000ms）
- `UPSTREAM_LOW_BALANCE_THRESHOLD`：`{ FASTPAY, FASTPAY_BLACK, TGPAY, L7PAY }`（各家低水位；`0` 代表不監控該方向）
- `UPSTREAM_HIGH_BALANCE_THRESHOLD`：`{ FASTPAY, FASTPAY_BLACK, TGPAY, L7PAY }`（各家高水位；`0` 代表不監控該方向）
- `ACCOUNT_JILI`、`ACCOUNT_JILI_ADMIN`（登入成功時 `label` 文字比對用帳號特徵）
- `GCASH_LOW_BALANCE_THRESHOLD`
- `REFRESH_CHANNEL_NAME_LIST`（`/start` 時並行刷新的通道名稱）
- `MERCHANT_LIST`（`/start` 批次刷新時要處理的商戶集合）
- `NOTIFY_CUSTOMER_SERVICE_LIST`（低餘額／高水位警報訊息末尾 @ 用戶名）
- `REPORT_HOURS_UTC8_LIST`（商戶跑量通知時段，UTC+8 的 `HH:mm` 字串陣列，供 `getDelayToNextReport`）
- `MERCHANT_PAYMENT_AMOUNT_NOTIF_LIST`（跑量通知訊息開頭要 @ 的用戶名陣列）
- `UNCERTAIN_CHANNEL_MAP`（商戶名小寫 → 通道文案；未知通道 fallback「找不到通道」）
- Upstream（由 `getUpstreamBalances` 讀取）：
  - `FASTPAY`：`MERCHANT_NO`／`KEY`／`DOMAIN`
  - `FASTPAY_BLACK`：`MERCHANT_NO`／`KEY`／`DOMAIN`
  - `TGPAY`：`PARTNER`／`DOMAIN`
  - `L7PAY`：`PARTNER`／`DOMAIN`（API 形態與 TGPay 相同：`POST {domain}/payment/query/balance`，params 鍵為 `parter`）

## Telegram 文案（`telegram/messageFormat.js`）

業務報表／轉發文案**只**放此檔（default export 物件 `messageFormat`）。指令狀態字串仍在 `registerTelegramCommands.js`。  
**對外輸出（Telegram 業務文案與指令狀態回覆）統一使用簡體中文**；註解／`console` 可不強制。

| 方法 | 用途 | 呼叫端 |
|------|------|--------|
| `formatJiliBalanceReport` | `Gotyme总余: …` | `balanceMonitorFlow` |
| `formatUpstreamBalanceReport` | FastPay／黑名单／TGPay／L7Pay 总余 | `balanceMonitorFlow`、`refreshCommandFlow` |
| `formatLowBalanceAlert` | 低于水位警報（`XXX总余: N 已经低于Y万，请注意`） | `lowbalanceAlert` |
| `formatHighBalanceAlert` | 高于水位警報（`XXX总余: N 已经高于Y万，请注意`） | `lowbalanceAlert` |
| `buildRefreshReportText` | `/start` 通道／商戶刷新結果 | `refreshCommandFlow` |
| `formatMerchantPaymentAmountNotif` | 商戶跑量 Top5 正文（先過濾 `successAmount === 0`） | `merchantPaymentAmountNotif` |

金額千分位一律先經 `tools.formatAmountWithCommas({ amount, maximumFractionDigits })` 再傳入 format 方法。`maximumFractionDigits` 預設 `2`（只設上限、不強制補 `.00`）。

## Telegram 指令（`telegram/registerTelegramCommands.js`）

啟動時**不會**自動跑餘額監控；批次刷新／餘額監控皆由 Telegram 指令觸發：

| 指令 | 行為 |
|------|------|
| `/start` | 批次刷新通道／商戶（`runRefreshCommandFlow`）；以 `isProcessing` 互斥，進行中再送會回「正在处理中，请稍后再试」 |
| `/monitor_on` | 背景啟動 `startBalanceMonitorFlow`（**不** `await`、**不**佔用 `isProcessing`）；已在跑則提示「余额监控已在运行中」 |
| `/monitor_off` | 設 `stopMonitor = true`；本輪查詢或 `sleep` 結束後停止 |
| `/help` | 回傳可用指令說明（`HELP_TEXT`，簡體） |
| 其他以 `/` 開頭的未知指令 | 回傳與 `/help` 相同內容；非 `/` 開頭的一般訊息忽略 |

狀態旗標：

- `isProcessing`：僅鎖住 `/start`，避免並行兩次刷新。
- `isMonitorRunning` / `stopMonitor`：控制監控生命週期；`/monitor_on` **不** `await` flow，必須把 `isMonitorRunning = false` 掛在 promise 的 `.finally`（不可用同步 `try/finally`，否則會立刻清旗標，導致 `/monitor_off` 誤判未運行）。

分頁關係：`/start` 在 `jiliContext` 內對每個通道／商戶 `newPage()`；監控使用啟動時建立的那張 `jiliPage`。兩者不同 page，可並跑。

## Upstream 餘額（`getUpstreamBalances`）

- 入口：`src/usecases/upstream/getUpstreamBalances.js` → `getUpstreamBalances({ config })`。
- 流程：
  1. FastPay／FastPay 黑名單：`sing.fastPay` 對 `merchantNo` 簽章 → `upstreamApi.getFastPayBalance`（`POST {domain}/api/account/searchAccount`）。
  2. TGPay：`upstreamApi.getTgPayBalance`（`POST {domain}/payment/query/balance`，params 鍵為 `parter`）。
  3. L7Pay：`upstreamApi.getL7PayBalance`（與 TGPay 同路徑／同 params 鍵 `parter`，domain／partner 來自 `config.L7PAY`）。
- 回傳：`{ fastPayBalanceData, fastPayBlackBalanceData, tgPayBalanceData, l7PayBalanceData }`（原始 API JSON）。
- 金額路徑（flow 內取用）：
  - FastPay／黑名單：`data?.[0]?.totalAmount`
  - TGPay／L7Pay：`param?.balance`
- 分層：簽章 → `sing.js`；HTTP → `upstreamApi.js`；組裝 → usecase；文案 → `telegram/messageFormat.js`。

## 批次刷新（`refreshCommandFlow`）

- 入口：`runRefreshCommandFlow({ chatId, channelNameList, jiliContext, telegramTools, merchantList, config })`（需 `config` 以查 Upstream）。
- 對 `REFRESH_CHANNEL_NAME_LIST` 每個名稱各開一頁，並行 `runJiliChannelProcess`。
- 若 `MERCHANT_LIST` 非空，另開一頁跑 `runJiliMarchantNameProcess`。
- `Promise.all` 彙整結果後：
  1. `messageFormat.buildRefreshReportText({ rowList })` 產出刷新段；
  2. `getUpstreamBalances` → `messageFormat.formatUpstreamBalanceReport` 產出 Upstream 段（含 L7Pay）；
  3. 回傳 `${jiliReportText}\n${upstreamReportText}`。
- 無工作時回「没有需要刷新的通道或商户名称」（不查 Upstream）。

### 通道刷新（`runJiliChannelProcess`）

- 選通道 → 狀態「开启」→ `reSearch` → `jiliTools.getChannelCardCount` 讀分頁 `span.el-pagination__total.is-first`（「共 N 条」）→ 逐頁全選並批次「更新」。
- 回傳扁平物件：`{ name, isMerchant, message, cardCount }`（`message === 'success'` 或錯誤字串）。

### 刷新報表文案（`messageFormat.buildRefreshReportText`）

- 分「通道」／「商户名称」兩段；失敗訊息會 `stripAnsi`。
- **全部成功**：成功清單帶張數，格式如 `通道名 (N张)`，以 `,\n` 連接。
- **有任一失敗**：成功段只列名稱（不帶張數），失敗段附錯誤訊息，結尾加「>>> 失败的部分请手动刷新」。
- 結尾皆有「>>> 皆已刷新完成」。

## 餘額監控（`balanceMonitorFlow`）

- 入口：`startBalanceMonitorFlow({ tools, jiliPage, telegramTools, groupChatId, config, shouldStop })`。
- `shouldStop` 預設 `() => false`；loop 條件為 `while (!shouldStop())`，非首次執行前 `sleep(RESEARCH_INTERVAL_MS)`，sleep 後再檢查一次。
- 每輪：
  1. `getUpstreamBalances({ config })` 取四家 Upstream 餘額；
  2. `getChannelAllAccountBalance` 查 Gotyme（彙總列名稱為簡體「总共」，與 `jiliTools.getBalanceList` 一致）；
  3. `formatJiliBalanceReport` + `formatUpstreamBalanceReport` 組字串後送到 `groupChatId`。
- （歷史／可選）`getGcashTooLowBalanceList`、PayMaya／`gcashwap-2` 查詢仍留在 usecase，目前監控 flow 未使用。
- 單輪錯誤只 `console.error`，不中斷 loop；停止靠 `shouldStop`（由 `/monitor_off` 驅動）。

## Upstream 低餘額高水位循環警報（`lowbalanceAlert`）

- 入口：`startLowBalanceAlertFlow({ tools, telegramTools, groupChatId, config })`（**不** await，不需要 Playwright／jili page）。
- 每 `LOW_BALANCE_ALERT_INTERVAL_MS`（預設 5 秒）查一次 `getUpstreamBalances`，每家各自維護記憶體狀態。
- Provider：`FASTPAY`、`FASTPAY_BLACK`、`TGPAY`、`L7PAY`（L7Pay 金額路徑為 `l7PayBalanceData?.param?.balance`，與 TGPay 相同，**不是** FastPay 的 `data?.[0]?.totalAmount`）。
- 狀態循環（每家獨立）：
  1. 預設等低水位：`balance < UPSTREAM_LOW_BALANCE_THRESHOLD` → 發 `formatLowBalanceAlert`，累計發送次數，**滿 2 次**後切換等高水位。
  2. 等高水位：`balance >= UPSTREAM_HIGH_BALANCE_THRESHOLD` → 發 `formatHighBalanceAlert`，**滿 2 次**後切回等低水位。
  3. 條件未觸發（餘額在低高水位之間）：重置該家發送計數，不換方向。
  4. 某方向水位 `<= 0` → 該方向不監控（例如 `FASTPAY_BLACK` 兩方向均設 0）。
  5. API 取不到數字（null／N/A）→ 該輪略過該家。
- 通知對象：`NOTIFY_CUSTOMER_SERVICE_LIST`。
- 狀態僅在記憶體；重啟後每家重設為「等低水位」。
- 文案內部用 `formatThresholdWan`：整萬數字顯示為「10万」，否則千分位數字。

## 商戶跑量定時通知（`merchantPaymentAmountNotif`）

- 入口：`merchantPaymentAmountNotif({ jiliContext, telegramTools, config })`（**不** await；`index.js` 在 jili 登入檢查後啟動）。
- 另開一張 page，導向成員統計：`#/member_system/member_statistics`；之後重用同一張 page。
- 排程：`tools.getDelayToNextReport({ reportHourList: config.REPORT_HOURS_UTC8_LIST })` 算到下一個 UTC+8 報表時點的毫秒數 → `setTimeout`；每輪結束（成功或失敗）在 `finally` 再呼叫 `scheduleNext()`，形成循環。
- 每輪步驟：
  1. `tools.getUtc8Parts()` 取當日 UTC+8 年月日與時分。
  2. `jiliTools.inputStartTimeEndTime`：填「开始日期／结束日期」為當日 `YYYY-M-D`（月日來自 `getUtc8Parts`，可能為單位數），`type` 後 `Enter` 確認並 `waitForTimeout(5000)`。
  3. `selectPageSize` 選 500 條 → `reSearch({ buttonIndex: 0 })`。
  4. 讀頁面「成功金额」卡片為當日總跑量（經 `formatAmountWithCommas`）。
  5. `jiliTools.getMemberDataList` 刮表格 → 依 `successAmount` 降序取 Top5。
  6. `messageFormat.formatMerchantPaymentAmountNotif` 組正文；header 為 `@用戶…` + `M/D HH:mm 总跑量 …`（時分 `padStart(2, '0')`）。
  7. 送到 `BALANCE_NOTIFICATION_GROUP_CHAT_ID`；錯誤只 `console.error`，不中斷排程。
- 分頁關係：與 `/start`、餘額監控各自用不同 page，可並跑。

### 跑量文案（`formatMerchantPaymentAmountNotif`）

- 先過濾掉 `successAmount === 0` 的商戶，再輸出「排名前五的商户」清單與分隔線後的通道明細。
- 通道推斷：`memberName` 含 `_` 時取最後一段小寫；`gotyme` → `GoTyme扫码`、`gcash` → `GCas扫码`、`maya` → `Maya直连`；其餘查 `UNCERTAIN_CHANNEL_MAP`（key 為商戶名小寫），沒有則「找不到通道」。

### 相關 page／tools API

- `jiliTools.getMemberDataList({ page })`：掃 `.el-table__body tbody tr.el-table__row`，回傳含 `memberName`、`successAmount` 等欄位。
- `jiliTools.getBalanceList({ page })`：空名稱列標記為「总共」（簡體）；`getChannelAllAccountBalance` 以同字串找彙總列。
- `jiliTools.inputStartTimeEndTime({ page, startTime, endTime })`：填日期後按 Enter 並等待 5 秒，避免日期選擇器未確認。
- `tools.getUtc8Parts(date?)`：回傳 UTC+8 的 `year/month/day/hour/minute/second`（數字）。
- `tools.getDelayToNextReport({ reportHourList })`：`reportHourList` 為當日 `HH:mm` 字串陣列（需已排序）；找下一個大於現在的時點，若皆已過則用翌日第一個。

## 開發慣例

- **模組**：`"type": "module"`，使用 `import`/`export`。
- **陣列命名**：只要值是陣列，常數、變數、參數、以及回傳陣列的函式名稱，結尾一律用 `List`（`config.json` 鍵用 `_LIST`）。
  - 變數／參數：`providerList`、`alertList`、`rowList`、`merchantList`、`merchantTop5List`
  - 常數：`HELP_LINE_LIST`
  - 函式：`createProviderList`、`getBalanceList`、`filterBalanceList`、`getAscendingSortList`
  - config 鍵：`REFRESH_CHANNEL_NAME_LIST`、`MERCHANT_LIST`、`NOTIFY_CUSTOMER_SERVICE_LIST`、`REPORT_HOURS_UTC8_LIST`、`MERCHANT_PAYMENT_AMOUNT_NOTIF_LIST`
  - 非陣列（物件、數字、字串、Playwright locator、`UNCERTAIN_CHANNEL_MAP`）不要加 `List`。
- **新流程**：優先放在 `src/flows/`。
- **Telegram 文案**：一律放 `telegram/messageFormat.js`；對外字串用**簡體**；勿再於 `src/usecases/*/messageFormat*` 新增檔案。
- **Jili 分層**：
  - 流程編排 → `src/flows/refreshCommandFlow.js`、`balanceMonitorFlow.js`、`merchantPaymentAmountNotif.js`
  - 業務步驟 → `src/usecases/jili/`（如 `runJiliChannelProcess`）
  - Telegram 文案 → `telegram/messageFormat.js`
  - 頁面級共用操作 → `src/pages/jiliTools.js`（`jiliTools`：如 `getChannelCardCount`、`selectChannelName`、`clickBatchUpdatButton`、`refreshAndWaitForBalanceTable`、`getMemberDataList`、`inputStartTimeEndTime`）
  - 共用非 page 工具 → 根目錄 `tools.js`
- **Upstream 分層**：
  - 簽章 → `sing.js`
  - HTTP → `upstreamApi.js`（`getFastPayBalance`／`getTgPayBalance`／`getL7PayBalance`）
  - 組裝 → `src/usecases/upstream/getUpstreamBalances.js`
  - 文案 → `telegram/messageFormat.formatUpstreamBalanceReport`
- **選擇器**：Jili 端大量依賴 Element UI class（`.el-select`、`tbody tr` 等）。改版前端時易碎，改動需實際跑頁驗證。
- **Lint**：`eslint.config.js`；改完可對修改過的檔案跑專案既有 lint 流程（若 CI 有則對齊 CI）。

## 除錯檢查清單

1. `config.json` 是否存在且 JSON 合法（含 `FASTPAY`／`FASTPAY_BLACK`／`TGPAY`／`L7PAY`）。
2. `jili_auth.json` 是否存在、是否過期（`jiliTools.goToUrl` 會以畫面文字判斷未登入）。
3. Telegram：`BALANCE_NOTIFICATION_GROUP_CHAT_ID` 與 bot 是否已在群內；polling 是否與其他程序重複佔用 token。
4. 餘額監控未通知：確認是否已送 `/monitor_on`；`/monitor_off` 後需等本輪或 sleep 結束才真正停。
5. Upstream 餘額顯示 `N/A` 或失敗：檢查對應 DOMAIN／簽章 KEY、網路，以及 flow 取用的 JSON 路徑是否仍正確（L7Pay／TGPay 用 `param.balance`）。
6. Playwright：本機除錯可暫時將 `index.js` 的 `BrowserTools({ headless: true })` 改為 `false`（僅限本機，勿把 headed 當預設提交）。
7. 低餘額警報一直未發：確認 `UPSTREAM_LOW_BALANCE_THRESHOLD` 對應家的值 `> 0`；若已發過 2 次，需等餘額回升到 `UPSTREAM_HIGH_BALANCE_THRESHOLD` 再發 2 次後才會回到等低水位。重啟程式可重置所有狀態。
8. 商戶跑量未通知：確認 `REPORT_HOURS_UTC8_LIST` 非空且時分格式為 `HH:mm`；成員統計頁日期是否有按 Enter 確認；Top5 全為 0 時正文會變空（`formatMerchantPaymentAmountNotif` 會濾掉 `successAmount === 0`）。
9. Gotyme 總餘為 `N/A`：確認 `jiliTools.getBalanceList` 與 `getChannelAllAccountBalance` 對彙總列皆用「总共」。

## 安全

- 永遠不要把真實 `config.json` 或 `*_auth.json` 內容貼進 issue／聊天／skill 範例。
- `.gitignore` 應維持忽略憑證與本機狀態檔；新增密文路徑時同步更新 ignore。
