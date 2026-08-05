---
name: 24pay-playwright
description: >-
  24pay Playwright 常駐服務：24pay 網頁登入與 WebSocket 轉發至 Telegram、Jili 後台餘額監控
  （/monitor_on|/monitor_off）與 /start 批次刷新，並彙整 Upstream（FastPay／TGPay／LeePay）餘額。
  使用於修改此 repo、除錯 Playwright 流程、Telegram 通知、config.json 或 auth 狀態檔相關工作時。
---

# 24pay Playwright 專案

Node.js（ES modules）+ Playwright + `node-telegram-bot-api` + `otplib`。主程式常駐執行兩條線：**24pay**（OTP 登入 + 監聽 websocket 轉發群組 + 定時報表）與 **Jili 後台**（storageState 登入 + Telegram 指令驅動的批次刷新／餘額監控）。餘額相關通知會一併帶 **Upstream API**（FastPay／FastPay 黑名單／TGPay／LeePay）。

## 目錄與責任

| 路徑 | 用途 |
|------|------|
| `index.js` | 組裝 config、Telegram、Browser、兩個 context（24pay / jili）、註冊各 flow 與 Telegram 指令 |
| `config.js` | 自專案根目錄讀取 `config.json`（`getConfig()`） |
| `config.json` | 機密與業務參數（勿提交版本庫；勿在對話中貼實際 token／密碼） |
| `manual.js` | 手動登入工具：`uploadAuthJiliAuthToGce()` 產生並上傳 `jili_auth.json`，`loginAdminJili()` 驗證 admin 登入 |
| `daily-manual.js` | 每日手動流程入口：先刷新並上傳 jili auth，再執行 admin 登入檢查 |
| `tools.js` | 共用工具（無 page）：`sleep`、`balanceListFilter`、`getAttayAscendingSort`、UTC+8（`getUtc8Parts`／`getDelayToNextReport`）、`formatAmountWithCommas` |
| `sing.js` | Upstream 簽章：`sing.fastPay({ params, key })`（排除空值／`sign` 後排序組字串，MD5 小寫 hex） |
| `upstreamApi.js` | Upstream HTTP：`getFastPayBalance`、`getTgPayBalance`、`getLeePayBalance`（僅打 API，不含簽章／業務組裝） |
| `telegram/telegram.js` | `TelegramTools`：polling、`onMessage`、`sendGroupMessage` |
| `telegram/messageFormat.js` | **所有** Telegram 業務文案集中處（見下方「Telegram 文案」） |
| `telegram/registerJiliCommands.js` | Jili Telegram 指令註冊（`/start`、`/monitor_on`、`/monitor_off`、`/help`）；指令狀態回覆字串寫在此檔 |
| `src/infra/browser.js` | `BrowserTools`：`chromium.launch` |
| `src/pages/` | 站台頁面操作：`24payLoginPage.js`（TOTP 登入）、`24payTools.js`（`toolBy24pay`：`openSideMenu`／`openThreeLevelSideMenu`／`openTab`）、`jiliLoginPage.js`、`jiliTools.js`（`jiliTools`：登入／導頁／通道選擇／餘額表／批次更新／`getChannelCardCount` 等） |
| `src/flows/` | 常駐／指令流程：`24payWsForwardFlow`、`24payScheduledReportFlow`、`balanceMonitorFlow`、`refreshCommandFlow` |
| `src/usecases/24pay/` | 24pay 可重用邏輯：`paymentOrderStats`（代收統計頁操作與取表）、`philippinePayment`（菲律賓支付頁篩選與支付方式金額） |
| `src/usecases/jili/` | Jili 可重用邏輯：餘額查詢（含可選的低餘額篩選 usecase）、`runJiliChannelProcess`／`runJiliMarchantNameProcess`、auth 狀態檢查等 |
| `src/usecases/upstream/` | Upstream 組裝：`getUpstreamBalances`（簽章 + 並行打四家 API，回傳原始 JSON） |

## 指令

```bash
npm install
npm run daily-manual # 本機 headed：刷新 jili_auth.json 並上傳，再驗證 admin 登入
npm run dev          # 啟動 index.js（headless browser）
```

- 主程式要求專案根目錄存在 **`jili_auth.json`**，否則 `ensureJiliAuthState` 會 `process.exit(1)` 並提示先跑 `daily-manual` 產生最新狀態檔。
- 登入成功判斷已改為「離開登入頁 + `label` 文字包含帳號」的雙條件檢查。

## `config.json` 鍵（僅列名稱）

實際值由部署環境提供；修改程式時對照 `index.js` 與各 flow 取用欄位即可。**勿在對話／skill 範例中貼實際密鑰。**

- `TELEGRAM_BOT_TOKEN`、`BALANCE_NOTIFICATION_GROUP_CHAT_ID`
- `RESEARCH_INTERVAL_MS`（餘額監控輪詢間隔）
- `SECRET_24PAY`、`ACCOUNT_24PAY`、`PASSWORD_24PAY`（24pay + TOTP）
- `ACCOUNT_JILI`、`ACCOUNT_JILI_ADMIN`（登入成功時 `label` 文字比對用帳號特徵）
- `GCASH_LOW_BALANCE_THRESHOLD`
- `REPORT_HOURS_UTC8`（24pay 定時報表排程時段，`HH:mm` 陣列）
- `PAYMENT_STATS_PAGE`（24pay 代收訂單統計選單與 tab/iframe 對應 id：`mainMenuId`／`subMenuId`）
- `PHILIPPINE_PAYMENT_PAGE`（24pay 菲律賓支付三層選單與 tab/iframe 對應 id：`mainMenuId`／`subMenuId`／`thirdMenuId`）
- `NOTIFY_24PAY_SCHEDULED_REPORT_USER_ID`（定時報表訊息開頭 @ 通知對象，陣列）
- `REFRESH_CHANNEL_NAME_LIST`（`/start` 時並行刷新的通道名稱）
- `MERCHANT_LIST`（`/start` 批次刷新時要處理的商戶集合）
- `NOTIFY_CUSTOMER_SERVICE_LIST`（24pay websocket 轉發訊息末尾 @ 用戶名）
- Upstream（由 `getUpstreamBalances` 讀取）：
  - `FASTPAY`：`MERCHANT_NO`／`KEY`／`DOMAIN`
  - `FASTPAY_BLACK`：`MERCHANT_NO`／`KEY`／`DOMAIN`
  - `TGPAY`：`PARTNER`／`DOMAIN`
  - `LEEPAY`：`TOKEN`／`DOMAIN`

## Telegram 文案（`telegram/messageFormat.js`）

業務報表／轉發文案**只**放此檔（default export 物件 `messageFormat`）。指令狀態字串仍在 `registerJiliCommands.js`。

| 方法 | 用途 | 呼叫端 |
|------|------|--------|
| `formatJiliBalanceReport` | `Gotyme總餘: …` | `balanceMonitorFlow` |
| `formatUpstreamBalanceReport` | FastPay／黑名單／TGPay／LeePay 總餘 | `balanceMonitorFlow`、`refreshCommandFlow` |
| `buildRefreshReportText` | `/start` 通道／商戶刷新結果 | `refreshCommandFlow` |
| `extract24payForwardMessage` | 解析 24pay WS payload | `24payWsForwardFlow` |
| `format24payScheduledReport` | 定時報表全文 | `24payScheduledReportFlow` |

金額千分位一律先經 `tools.formatAmountWithCommas` 再傳入 format 方法。

## Telegram 指令（`telegram/registerJiliCommands.js`）

啟動時**不會**自動跑餘額監控；Jili 相關能力皆由 Telegram 指令觸發：

| 指令 | 行為 |
|------|------|
| `/start` | 批次刷新通道／商戶（`runRefreshCommandFlow`）；以 `isProcessing` 互斥，進行中再送會回「正在處理中」 |
| `/monitor_on` | 背景啟動 `startBalanceMonitorFlow`（**不** `await`、**不**佔用 `isProcessing`）；已在跑則提示已運行 |
| `/monitor_off` | 設 `stopMonitor = true`；本輪查詢或 `sleep` 結束後停止 |
| `/help` | 回傳可用指令說明（`HELP_TEXT`） |
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
  3. LeePay：`upstreamApi.getLeePayBalance`（`GET {domain}/api/balance/inquiry`，Bearer token）。
- 回傳：`{ fastPayBalanceData, fastPayBlackBalanceData, tgPayBalanceData, leePayBalanceData }`（原始 API JSON）。
- 金額路徑（flow 內取用）：
  - FastPay／黑名單：`data?.[0]?.totalAmount`
  - TGPay：`param?.balance`
  - LeePay：`data?.balance`
- 分層：簽章 → `sing.js`；HTTP → `upstreamApi.js`；組裝 → usecase；文案 → `telegram/messageFormat.js`。

## 批次刷新（`refreshCommandFlow`）

- 入口：`runRefreshCommandFlow({ chatId, channelNameList, jiliContext, telegramTools, merchantList, config })`（需 `config` 以查 Upstream）。
- 對 `REFRESH_CHANNEL_NAME_LIST` 每個名稱各開一頁，並行 `runJiliChannelProcess`。
- 若 `MERCHANT_LIST` 非空，另開一頁跑 `runJiliMarchantNameProcess`。
- `Promise.all` 彙整結果後：
  1. `messageFormat.buildRefreshReportText({ rows })` 產出刷新段；
  2. `getUpstreamBalances` → `messageFormat.formatUpstreamBalanceReport` 產出 Upstream 段；
  3. 回傳 `${jiliReportText}\n${upstreamReportText}`。
- 無工作時回「没有需要刷新的通道或商户名稱」（不查 Upstream）。

### 通道刷新（`runJiliChannelProcess`）

- 選通道 → 狀態「开启」→ `reSearch` → `jiliTools.getChannelCardCount` 讀分頁 `span.el-pagination__total.is-first`（「共 N 条」）→ 逐頁全選並批次「更新」。
- 回傳扁平物件：`{ name, isMerchant, message, cardCount }`（`message === 'success'` 或錯誤字串）。

### 刷新報表文案（`messageFormat.buildRefreshReportText`）

- 分「通道」／「商戶名稱」兩段；失敗訊息會 `stripAnsi`。
- **全部成功**：成功清單帶張數，格式如 `通道名 (N张)`，以 `,\n` 連接。
- **有任一失敗**：成功段只列名稱（不帶張數），失敗段附錯誤訊息，結尾加「>>> 失敗的部分請手動刷新」。
- 結尾皆有「>>> 皆已刷新完成」。

## 餘額監控（`balanceMonitorFlow`）

- 入口：`startBalanceMonitorFlow({ tools, jiliPage, telegramTools, groupChatId, config, shouldStop })`。
- `shouldStop` 預設 `() => false`；loop 條件為 `while (!shouldStop())`，非首次執行前 `sleep(RESEARCH_INTERVAL_MS)`，sleep 後再檢查一次。
- 每輪：
  1. `getUpstreamBalances({ config })` 取四家 Upstream 餘額；
  2. `getChannelAllAccountBalance` 查 Gotyme；
  3. `formatJiliBalanceReport` + `formatUpstreamBalanceReport` 組字串後送到 `groupChatId`。
- （歷史／可選）`getGcashTooLowBalanceList`、PayMaya／`gcashwap-2` 查詢仍留在 usecase，目前監控 flow 未使用。
- 單輪錯誤只 `console.error`，不中斷 loop；停止靠 `shouldStop`（由 `/monitor_off` 驅動）。

## 24pay WebSocket 轉發（`24payWsForwardFlow`）

- 監聽 page websocket `framereceived`，以 `messageFormat.extract24payForwardMessage` 解析 payload。
- 有效訊息末尾附加 `NOTIFY_CUSTOMER_SERVICE_LIST` 的 `@` 名單，送到群組。

## 24pay 定時報表流程（`24payScheduledReportFlow`）

- 啟動時先開兩個頁籤（不立即發報）：
  - `toolBy24pay.openSideMenu` → 代收訂單統計（`PAYMENT_STATS_PAGE.mainMenuId/subMenuId`）
  - `toolBy24pay.openThreeLevelSideMenu` → 菲律賓支付（`PHILIPPINE_PAYMENT_PAGE.mainMenuId/subMenuId/thirdMenuId`）
- 依 `REPORT_HOURS_UTC8` 用 `tools.getDelayToNextReport`（UTC+8）計算下一個執行點，`setTimeout` 單次排程，執行完再遞迴排下一次。
- 每次執行：
  1. `paymentOrderStats` 以 `toolBy24pay.openTab` 切 tab、填當日 `00:00:00 ~ 23:59:59`、送出查詢、點下拉箭頭、讀主表／明細。
  2. `sortMerchantBySuccessAmount` 依 `OrderSuccessAmount` 排序明細商戶，取前五家。
  3. 對前五家逐一呼叫 `philippinePayment.getMerchantPayTypePayment`（`orderStatus: Completed`；支付方式：`GoTyme`／`MAYA_DIRECT`／`GCASH_QR`），並附上 `merchantName`（`CompanyName`）。
  4. 文案由 `messageFormat.format24payScheduledReport` 產生後送到 `BALANCE_NOTIFICATION_GROUP_CHAT_ID`。

### 定時報表文案（`format24payScheduledReport`）

- 參數：`todayPaymentOrderStats`、`merchantPayTypePaymentList`、`notifyUserText`。
- 開頭：`@通知對象`（可選）+ `MM/DD HH:mm總跑量 xxxxx.xx`；總跑量取「各商户汇总」列（找不到則退回第一列）的 `OrderPayAmount`。
- `前五家：` 以 `CompanyName`（缺則退回 `MerchantNo`）+ `OrderSuccessAmount` 列出。
- 其後每位前五商戶一段明細：分隔線 `——————————` + 商戶名 + `GoTyme扫码`／`Maya直连`／`GCash扫码` 金額（來自菲律賓支付頁彙總列 `PayAmount`，已千分位格式化；金額為 0 的支付方式不列出）。

### 菲律賓支付取數（`philippinePayment`）

- 頁面操作皆先 `toolBy24pay.openTab({ targetId: PHILIPPINE_PAYMENT_PAGE.thirdMenuId })`。
- `getMerchantPayTypePayment`：設時間／商戶號／訂單狀態後，對 `merchantPayTypeList` 逐一設支付方式 → 搜尋 → `getPayment` 讀表尾 `PayAmount`。
- 回傳形如 `{ merchantNo, GoTyme, MAYA_DIRECT, GCASH_QR }`（金額字串已千分位）；flow 再補 `merchantName`。

## 開發慣例

- **模組**：`"type": "module"`，使用 `import`/`export`。
- **新流程**：優先放在 `src/flows/`。
- **Telegram 文案**：一律放 `telegram/messageFormat.js`；勿再於 `src/usecases/*/messageFormat*` 新增檔案。
- **24pay 分層**：
  - 頁面操作共用 → `src/pages/24payTools.js`（`toolBy24pay`：`openSideMenu` 兩層、`openThreeLevelSideMenu` 三層、`openTab` 切頁籤）
  - 業務步驟／取數 → `src/usecases/24pay/`（如 `paymentOrderStats`、`philippinePayment`）
  - Telegram 文案 → `telegram/messageFormat.js`
  - 跨站台時間與金額格式 → 根目錄 `tools.js`
- **Jili 分層**：
  - 流程編排 → `src/flows/refreshCommandFlow.js`、`balanceMonitorFlow.js`
  - 業務步驟 → `src/usecases/jili/`（如 `runJiliChannelProcess`）
  - Telegram 文案 → `telegram/messageFormat.js`
  - 頁面級共用操作 → `src/pages/jiliTools.js`（`jiliTools`：如 `getChannelCardCount`、`selectChannelName`、`clickBatchUpdatButton`、`refreshAndWaitForBalanceTable`）
  - 共用非 page 工具 → 根目錄 `tools.js`
- **Upstream 分層**：
  - 簽章 → `sing.js`
  - HTTP → `upstreamApi.js`
  - 組裝 → `src/usecases/upstream/getUpstreamBalances.js`
  - 文案 → `telegram/messageFormat.formatUpstreamBalanceReport`
- **選擇器**：Jili 端大量依賴 Element UI class（`.el-select`、`tbody tr` 等）；24pay 側邊選單展開用 `:scope > ul.sub-menu` 避免抓到巢狀子選單。改版前端時易碎，改動需實際跑頁驗證。
- **24pay 登入**：`otplib` 產生一次性碼；失敗時檢查 `SECRET_24PAY` 與網路／頁面載入。
- **Lint**：`eslint.config.js`；改完可對修改過的檔案跑專案既有 lint 流程（若 CI 有則對齊 CI）。

## 除錯檢查清單

1. `config.json` 是否存在且 JSON 合法（含 `PAYMENT_STATS_PAGE`、`PHILIPPINE_PAYMENT_PAGE`、`FASTPAY`／`FASTPAY_BLACK`／`TGPAY`／`LEEPAY`）。
2. `jili_auth.json` 是否存在、是否過期（`jiliTools.goToUrl` 會以畫面文字判斷未登入）。
3. Telegram：`BALANCE_NOTIFICATION_GROUP_CHAT_ID` 與 bot 是否已在群內；polling 是否與其他程序重複佔用 token。
4. 餘額監控未通知：確認是否已送 `/monitor_on`；`/monitor_off` 後需等本輪或 sleep 結束才真正停。
5. Upstream 餘額顯示 `N/A` 或失敗：檢查對應 DOMAIN／簽章 KEY／TOKEN、網路，以及 flow 取用的 JSON 路徑是否仍正確。
6. 24pay 定時報表若抓到舊資料，優先檢查「開始時間 / 結束時間」欄位是否確實被填入當日區間再送出查詢。
7. 定時報表缺支付方式明細：確認菲律賓支付頁已由 `openThreeLevelSideMenu` 開啟，且 `philippinePayment` 能切到 `thirdMenuId` tab／iframe。
8. Playwright：本機除錯可暫時將 `index.js` 的 `BrowserTools({ headless: true })` 改為 `false`（僅限本機，勿把 headed 當預設提交）。

## 安全

- 永遠不要把真實 `config.json` 或 `*_auth.json` 內容貼進 issue／聊天／skill 範例。
- `.gitignore` 應維持忽略憑證與本機狀態檔；新增密文路徑時同步更新 ignore。
