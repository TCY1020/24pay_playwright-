---
name: 24pay-playwright
description: >-
  24pay Playwright 常駐服務：24pay 網頁登入與 WebSocket 轉發至 Telegram、Jili 後台餘額監控與
  /start 批次刷新。使用於修改此 repo、除錯 Playwright 流程、Telegram 通知、config.json 或
  auth 狀態檔相關工作時。
---

# 24pay Playwright 專案

Node.js（ES modules）+ Playwright + `node-telegram-bot-api` + `otplib`。主程式常駐執行兩條線：**24pay**（OTP 登入 + 監聽 websocket 轉發群組）與 **Jili 後台**（storageState 登入 + 餘額輪詢 + Telegram 指令刷新）。

## 目錄與責任

| 路徑 | 用途 |
|------|------|
| `index.js` | 組裝 config、Telegram、Browser、兩個 context（24pay / jili）、註冊各 flow |
| `config.js` | 自專案根目錄讀取 `config.json`（`getConfig()`） |
| `config.json` | 機密與業務參數（勿提交版本庫；勿在對話中貼實際 token／密碼） |
| `auth-setup.js` | 本機 **headed** 手動登入後寫出 `{BACKSTAGE}_auth.json`（預設 `jili` → `jili_auth.json`） |
| `tools.js` | 共用 `Tools`：登入導頁、`gotoUrl`、Element UI 選擇器、表格刷新等 |
| `telegram.js` | `TelegramTools`：polling、`onMessage`、`sendGroupMessage` |
| `src/infra/browser.js` | `BrowserTools`：`chromium.launch` |
| `src/pages/` | 各站台登入頁流程（如 `24payLoginPage.js` 用 TOTP） |
| `src/flows/` | 常駐流程：`24payWsForwardFlow`、`jiliBalanceMonitorFlow`、`jiliRefreshCommandFlow` |
| `src/usecases/` | 可重用的單一用途邏輯（24pay 訊息解析、Jili 餘額查詢與報表格式等） |

## 指令

```bash
npm install
npm run auth-setup   # 本機產生 jili_auth.json（需可見瀏覽器；可設 BACKSTAGE=jili）
npm run dev          # 啟動 index.js（headless browser）
```

- 主程式要求專案根目錄存在 **`jili_auth.json`**，否則 `ensureJiliAuthState` 會 `process.exit(1)` 並提示先跑 `auth-setup`。
- `auth-setup.js` 註解若寫 `npm run auth-save`，以 **`package.json` 的 `auth-setup` script** 為準。

## `config.json` 鍵（僅列名稱）

實際值由部署環境提供；修改程式時對照 `index.js` 與各 flow 取用欄位即可。

- `TELEGRAM_BOT_TOKEN`、`TELEGRAM_GROUP_CHAT_ID`
- `RESEARCH_INTERVAL_MS`（Jili 餘額輪詢間隔）
- `SECRET_24PAY`、`ACCOUNT_24PAY`、`PASSWORD_24PAY`（24pay + TOTP）
- `ACCOUNT_JILI`（auth-setup 等待畫面上出現的帳號文字特徵）
- `GCASH_LOW_BALANCE_THRESHOLD`
- `REFRESH_CHANNEL_NAME_LIST`（`/start` 時並行刷新的通道名稱）
- `NOTIFY_CUSTOMER_SERVICE_LIST`（24pay websocket 轉發訊息末尾 @ 用戶名）

## 開發慣例

- **模組**：`"type": "module"`，使用 `import`/`export`。
- **新流程**：優先放在 `src/flows/`；可重用步驟放在 `src/usecases/`，與現有 `runJiliChannelProcess`、`extract24payForwardMessage` 風格一致。
- **選擇器**：Jili 端大量依賴 Element UI class（`.el-select`、`tbody tr` 等）；改版前端時易碎，改動需實際跑頁驗證。
- **24pay 登入**：`otplib` 產生一次性碼；失敗時檢查 `SECRET_24PAY` 與網路／頁面載入。
- **Lint**：`eslint.config.js`；改完可對修改過的檔案跑專案既有 lint 流程（若 CI 有則對齊 CI）。

## 除錯檢查清單

1. `config.json` 是否存在且 JSON 合法。
2. `jili_auth.json` 是否存在、是否過期（`tools.gotoUrl` 會以畫面文字判斷未登入）。
3. Telegram：`TELEGRAM_GROUP_CHAT_ID` 與 bot 是否已在群內；polling 是否與其他程序重複佔用 token。
4. Playwright：本機除錯可暫時將 `index.js` 的 `BrowserTools({ headless: true })` 改為 `false`（僅限本機，勿把 headed 當預設提交）。

## 安全

- 永遠不要把真實 `config.json` 或 `*_auth.json` 內容貼進 issue／聊天／skill 範例。
- `.gitignore` 應維持忽略憑證與本機狀態檔；新增密文路徑時同步更新 ignore。
