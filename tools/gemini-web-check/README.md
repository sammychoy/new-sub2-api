# Gemini Web API 檢查

直接使用你平常 Chrome 裡的 Gemini 登入 cookie，呼叫 `cloudflare/worker/src/services/gemini-web.ts`（閘道實際使用的同一份程式碼）測試 API 路徑。腳本不會印出 cookie 或 token 的值。

為什麼不自動登入？Google 會擋住自動化瀏覽器的登入（顯示「目前無法登入帳戶」），所以這個工具不開瀏覽器、也不做登入，只使用你已經取得的 cookie。

## 需求

- Node.js 22.6 以上（與 worker 相同），不需要安裝任何套件。

## 使用

1. 在你平常使用的 Chrome 登入 gemini.google.com。
2. 複製 cookie，二選一：
   - 使用 `tools/gemini-cookie-extension` 的「一鍵複製憑證」。
   - 在 DevTools 的 Application → Cookies 分別複製 `__Secure-1PSID` 與 `__Secure-1PSIDTS`，貼到剪貼簿，格式為 `__Secure-1PSID=...; __Secure-1PSIDTS=...`。
3. 在本資料夾執行：

```bash
npm run check
```

過幾個小時後，可以不用 cookie，直接測試上次存下來的 session（用來觀察 access token 會不會過期）：

```bash
npm run check:stored
```

也可以不用剪貼簿，改用環境變數：

```powershell
$env:GEMINI_SECURE_1PSID = "..."
$env:GEMINI_SECURE_1PSIDTS = "..."
npm run check
```

## 檢查項目

| 項目 | 說明 |
|---|---|
| Cookie 來源 | 從剪貼簿或環境變數讀取 `__Secure-1PSID`、`__Secure-1PSIDTS` |
| API 路徑：initSession | 抓取 `SNlM0e` 等 token，與閘道的初始化流程相同 |
| API 路徑：對話 | 非串流與串流各一次，與閘道呼叫的程式碼相同，並顯示回傳的 `role` |

## 注意事項

- 每次執行都會在該帳號的 Gemini 歷史紀錄中新增對話。
- 成功執行後會在 `%LOCALAPPDATA%\sub2api-gemini-web-check\session.json` 存下 session（含 cookie），等同密碼。不要複製進 repo，不用時刪除整個資料夾。
- 用完建議清除剪貼簿。
